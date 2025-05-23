/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import fetchMock from 'fetch-mock';
import {
  act,
  render,
  screen,
  selectOption,
  userEvent,
  waitFor,
} from 'spec/helpers/testing-library';
import RowLevelSecurityModal, {
  RowLevelSecurityModalProps,
} from './RowLevelSecurityModal';
import { FilterType } from './types';

const getRuleEndpoint = 'glob:*/api/v1/rowlevelsecurity/1';
const getRelatedRolesEndpoint =
  'glob:*/api/v1/rowlevelsecurity/related/roles?q*';
const getRelatedTablesEndpoint =
  'glob:*/api/v1/rowlevelsecurity/related/tables?q*';
const postRuleEndpoint = 'glob:*/api/v1/rowlevelsecurity/*';
const putRuleEndpoint = 'glob:*/api/v1/rowlevelsecurity/1';

const mockGetRuleResult = {
  description_columns: {},
  id: 1,
  label_columns: {
    clause: 'Clause',
    description: 'Description',
    filter_type: 'Filter Type',
    group_key: 'Group Key',
    name: 'Name',
    'roles.id': 'Roles Id',
    'roles.name': 'Roles Name',
    'tables.id': 'Tables Id',
    'tables.table_name': 'Tables Table Name',
  },
  result: {
    clause: 'gender="girl"',
    description: 'test rls rule with RTL',
    filter_type: 'Base',
    group_key: 'g1',
    id: 1,
    name: 'rls 1',
    roles: [
      {
        id: 1,
        name: 'Admin',
      },
    ],
    tables: [
      {
        id: 2,
        table_name: 'birth_names',
      },
    ],
  },
  show_columns: [
    'name',
    'description',
    'filter_type',
    'tables.id',
    'tables.table_name',
    'roles.id',
    'roles.name',
    'group_key',
    'clause',
  ],
  show_title: 'Show Row Level Security Filter',
};

const mockGetRolesResult = {
  count: 3,
  result: [
    {
      extra: {},
      text: 'Admin',
      value: 1,
    },
    {
      extra: {},
      text: 'Public',
      value: 2,
    },
    {
      extra: {},
      text: 'Alpha',
      value: 3,
    },
  ],
};

const mockGetTablesResult = {
  count: 3,
  result: [
    {
      extra: {},
      text: 'wb_health_population',
      value: 1,
    },
    {
      extra: {},
      text: 'birth_names',
      value: 2,
    },
    {
      extra: {},
      text: 'long_lat',
      value: 3,
    },
  ],
};

fetchMock.get(getRuleEndpoint, mockGetRuleResult);
fetchMock.get(getRelatedRolesEndpoint, mockGetRolesResult);
fetchMock.get(getRelatedTablesEndpoint, mockGetTablesResult);
fetchMock.post(postRuleEndpoint, {});
fetchMock.put(putRuleEndpoint, {});

global.URL.createObjectURL = jest.fn();

const NOOP = () => {};

const addNewRuleDefaultProps: RowLevelSecurityModalProps = {
  addDangerToast: NOOP,
  addSuccessToast: NOOP,
  show: true,
  rule: null,
  onHide: NOOP,
};

describe('Rule modal', () => {
  async function renderAndWait(props: RowLevelSecurityModalProps) {
    const mounted = act(async () => {
      render(<RowLevelSecurityModal {...props} />, { useRedux: true });
    });
    return mounted;
  }

  it('Sets correct title for adding new rule', async () => {
    await renderAndWait(addNewRuleDefaultProps);
    const title = screen.getByText('Add Rule');
    expect(title).toBeInTheDocument();
    expect(fetchMock.calls(getRuleEndpoint)).toHaveLength(0);
    expect(fetchMock.calls(getRelatedTablesEndpoint)).toHaveLength(0);
    expect(fetchMock.calls(getRelatedRolesEndpoint)).toHaveLength(0);
  });

  it('Sets correct title for editing existing rule', async () => {
    await renderAndWait({
      ...addNewRuleDefaultProps,
      rule: {
        id: 1,
        name: 'test rule',
        filter_type: FilterType.Base,
        tables: [{ key: 1, id: 1, value: 'birth_names' }],
        roles: [],
      },
    });
    const title = screen.getByText('Edit Rule');
    expect(title).toBeInTheDocument();
    expect(fetchMock.calls(getRuleEndpoint)).toHaveLength(1);
    expect(fetchMock.calls(getRelatedTablesEndpoint)).toHaveLength(0);
    expect(fetchMock.calls(getRelatedRolesEndpoint)).toHaveLength(0);
  });

  it('Fills correct values when editing rule', async () => {
    await renderAndWait({
      ...addNewRuleDefaultProps,
      rule: {
        id: 1,
        name: 'rls 1',
        filter_type: FilterType.Base,
      },
    });

    const name = await screen.findByTestId('rule-name-test');
    expect(name).toHaveDisplayValue('rls 1');
    userEvent.clear(name);
    userEvent.type(name, 'rls 2');
    expect(name).toHaveDisplayValue('rls 2');

    const filterType = await screen.findByText('Base');
    expect(filterType).toBeInTheDocument();

    const roles = await screen.findByText('Admin');
    expect(roles).toBeInTheDocument();

    const tables = await screen.findByText('birth_names');
    expect(tables).toBeInTheDocument();

    const groupKey = await screen.findByTestId('group-key-test');
    expect(groupKey).toHaveValue('g1');
    userEvent.clear(groupKey);
    userEvent.type(groupKey, 'g2');
    expect(groupKey).toHaveValue('g2');

    const clause = await screen.findByTestId('clause-test');
    expect(clause).toHaveValue('gender="girl"');
    userEvent.clear(clause);
    userEvent.type(clause, 'gender="boy"');
    expect(clause).toHaveValue('gender="boy"');

    const description = await screen.findByTestId('description-test');
    expect(description).toHaveValue('test rls rule with RTL');
    userEvent.clear(description);
    userEvent.type(description, 'test description');
    expect(description).toHaveValue('test description');
  });

  it('Does not allow to create rule without name, tables and clause', async () => {
    jest.setTimeout(10000);
    await renderAndWait(addNewRuleDefaultProps);

    const addButton = screen.getByRole('button', { name: /add/i });
    expect(addButton).toBeDisabled();

    const nameTextBox = screen.getByTestId('rule-name-test');
    userEvent.type(nameTextBox, 'name');

    expect(addButton).toBeDisabled();

    await selectOption('birth_names', 'Tables');
    expect(addButton).toBeDisabled();

    const clause = await screen.findByTestId('clause-test');
    userEvent.type(clause, 'gender="girl"');

    expect(addButton).toBeEnabled();
  });

  it('Creates a new rule', async () => {
    await renderAndWait(addNewRuleDefaultProps);

    const addButton = screen.getByRole('button', { name: /add/i });

    const nameTextBox = screen.getByTestId('rule-name-test');
    userEvent.type(nameTextBox, 'name');

    await selectOption('birth_names', 'Tables');

    const clause = await screen.findByTestId('clause-test');
    userEvent.type(clause, 'gender="girl"');

    await waitFor(() => userEvent.click(addButton), { timeout: 10000 });

    await waitFor(
      () => {
        expect(fetchMock.calls(postRuleEndpoint)).toHaveLength(1);
      },
      { timeout: 10000 },
    );
  });

  it('Updates existing rule', async () => {
    await renderAndWait({
      ...addNewRuleDefaultProps,
      rule: {
        id: 1,
        name: 'rls 1',
        filter_type: FilterType.Base,
      },
    });

    const addButton = screen.getByRole('button', { name: /save/i });
    await waitFor(() => userEvent.click(addButton));

    await waitFor(
      () => {
        const allCalls = fetchMock.calls(putRuleEndpoint);
        // Find the PUT request among all calls
        const putCall = allCalls.find(call => call[1]?.method === 'PUT');
        expect(putCall).toBeTruthy();
        expect(putCall?.[1]?.body).toContain('"name":"rls 1"');
        expect(putCall?.[1]?.body).toContain('"filter_type":"Base"');
      },
      { timeout: 10000 },
    );
  });
});
