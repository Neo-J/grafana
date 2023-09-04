import { css } from '@emotion/css';
import React, { useMemo, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';

import { applyFieldOverrides, DataFrame, DataLinkClickEvent, Field, FieldType, GrafanaTheme2 } from '@grafana/data';
import {
  IconButton,
  Table,
  TableCellDisplayMode,
  TableCustomCellOptions,
  TableFieldOptions,
  TableSortByFieldState,
} from '@grafana/ui';

import { FlameGraphDataContainer } from '../FlameGraph/dataTransform';
import { TOP_TABLE_COLUMN_WIDTH } from '../constants';
import { TableData } from '../types';

type Props = {
  data: FlameGraphDataContainer;
  onSymbolClick: (symbol: string) => void;
  height?: number;
  search?: string;
  sandwichItem?: string;
  onSearch: (str: string) => void;
  onSandwich: (str?: string) => void;
  onTableSort?: (sort: string) => void;
  getTheme: () => GrafanaTheme2;
  vertical?: boolean;
};

const FlameGraphTopTableContainer = React.memo(
  ({
    data,
    onSymbolClick,
    height,
    search,
    onSearch,
    sandwichItem,
    onSandwich,
    onTableSort,
    getTheme,
    vertical,
  }: Props) => {
    const table = useMemo(() => {
      // Group the data by label, we show only one row per label and sum the values
      // TODO: should be by filename + funcName + linenumber?
      let table: { [key: string]: TableData } = {};
      for (let i = 0; i < data.data.length; i++) {
        const value = data.getValue(i);
        const self = data.getSelf(i);
        const label = data.getLabel(i);
        table[label] = table[label] || {};
        table[label].self = table[label].self ? table[label].self + self : self;
        table[label].total = table[label].total ? table[label].total + value : value;
      }
      return table;
    }, [data]);

    const rowHeight = 35;
    // When we use normal layout we size the table to have the same height as the flamegraph to look good side by side.
    // In vertical layout we don't need that so this is a bit arbitrary. We want some max limit
    // so we don't show potentially thousands of rows at once which can hinder performance (the table is virtualized
    // so with some max height it handles it fine)
    const tableHeight = vertical ? Math.min(Object.keys(table).length * rowHeight, 800) : 0;
    const styles = getStyles(tableHeight);

    const [sort, setSort] = useState<TableSortByFieldState[]>([{ displayName: 'Self', desc: true }]);

    return (
      <div className={styles.topTableContainer} data-testid="topTable">
        <AutoSizer style={{ width: '100%', height }}>
          {({ width, height }) => {
            if (width < 3 || height < 3) {
              return null;
            }

            const frame = buildTableDataFrame(
              table,
              data.valueField.config.unit,
              data.selfField.config.unit,
              width,
              onSymbolClick,
              onSearch,
              onSandwich,
              getTheme,
              search,
              sandwichItem
            );
            return (
              <Table
                initialSortBy={sort}
                onSortByChange={(s) => {
                  if (s && s.length) {
                    onTableSort?.(s[0].displayName + '_' + (s[0].desc ? 'desc' : 'asc'));
                  }
                  setSort(s);
                }}
                data={frame}
                width={width}
                height={height}
              />
            );
          }}
        </AutoSizer>
      </div>
    );
  }
);

FlameGraphTopTableContainer.displayName = 'FlameGraphTopTableContainer';

function buildTableDataFrame(
  table: { [key: string]: TableData },
  valueUnit: string | undefined,
  selfUnit: string | undefined,
  width: number,
  onSymbolClick: (str: string) => void,
  onSearch: (str: string) => void,
  onSandwich: (str?: string) => void,
  getTheme: () => GrafanaTheme2,
  search?: string,
  sandwichItem?: string
): DataFrame {
  const actionField: Field = createActionField(onSandwich, onSearch, search, sandwichItem);

  const symbolField: Field = {
    type: FieldType.string,
    name: 'Symbol',
    values: [],
    config: {
      custom: { width: width - actionColumnWidth - TOP_TABLE_COLUMN_WIDTH * 2 },
      links: [
        {
          title: 'Highlight symbol',
          url: '',
          onClick: (e: DataLinkClickEvent) => {
            const field: Field = e.origin.field;
            const value = field.values[e.origin.rowIndex];
            onSymbolClick(value);
          },
        },
      ],
    },
  };

  const selfField = createNumberField('Self', selfUnit);
  const totalField = createNumberField('Total', valueUnit);

  for (let key in table) {
    actionField.values.push(null);
    symbolField.values.push(key);
    selfField.values.push(table[key].self);
    totalField.values.push(table[key].total);
  }

  const frame = { fields: [actionField, symbolField, selfField, totalField], length: symbolField.values.length };

  const dataFrames = applyFieldOverrides({
    data: [frame],
    fieldConfig: {
      defaults: {},
      overrides: [],
    },
    replaceVariables: (value: string) => value,
    theme: getTheme(),
  });

  return dataFrames[0];
}

function createNumberField(name: string, unit?: string): Field {
  return {
    type: FieldType.number,
    name,
    values: [],
    config: { unit, custom: { width: TOP_TABLE_COLUMN_WIDTH } },
  };
}

const actionColumnWidth = 61;

function createActionField(
  onSandwich: (str?: string) => void,
  onSearch: (str: string) => void,
  search?: string,
  sandwichItem?: string
): Field {
  const options: TableCustomCellOptions = {
    type: TableCellDisplayMode.Custom,
    cellComponent: (props) => {
      return (
        <ActionCell
          frame={props.frame}
          onSandwich={onSandwich}
          onSearch={onSearch}
          search={search}
          sandwichItem={sandwichItem}
          rowIndex={props.rowIndex}
        />
      );
    },
  };

  const actionFieldTableConfig: TableFieldOptions = {
    filterable: false,
    width: actionColumnWidth,
    hideHeader: true,
    inspect: false,
    align: 'auto',
    cellOptions: options,
  };

  return {
    type: FieldType.number,
    name: 'actions',
    values: [],
    config: {
      custom: actionFieldTableConfig,
    },
  };
}

type ActionCellProps = {
  frame: DataFrame;
  rowIndex: number;
  search?: string;
  sandwichItem?: string;
  onSearch: (symbol: string) => void;
  onSandwich: (symbol: string) => void;
};

function ActionCell(props: ActionCellProps) {
  const styles = getStylesActionCell();
  const symbol = props.frame.fields.find((f: Field) => f.name === 'Symbol')?.values[props.rowIndex];
  const isSearched = props.search === symbol;
  const isSandwiched = props.sandwichItem === symbol;

  return (
    <div className={styles.actionCellWrapper}>
      <IconButton
        className={styles.actionCellButton}
        name={'search'}
        variant={isSearched ? 'primary' : 'secondary'}
        tooltip={isSearched ? 'Clear from search' : 'Search for symbol'}
        aria-label={isSearched ? 'Clear from search' : 'Search for symbol'}
        onClick={() => {
          props.onSearch(isSearched ? '' : symbol);
        }}
      />
      <IconButton
        className={styles.actionCellButton}
        name={'gf-show-context'}
        tooltip={isSandwiched ? 'Remove from sandwich view' : 'Show in sandwich view'}
        variant={isSandwiched ? 'primary' : 'secondary'}
        aria-label={isSandwiched ? 'Remove from sandwich view' : 'Show in sandwich view'}
        onClick={() => {
          props.onSandwich(isSandwiched ? undefined : symbol);
        }}
      />
    </div>
  );
}

const getStyles = (height: number) => {
  return {
    topTableContainer: css`
      label: topTableContainer;
      flex-grow: 1;
      flex-basis: 50%;
      overflow: hidden;
      ${height
        ? css`
            min-height: ${height}px;
          `
        : ''}
    `,
  };
};

const getStylesActionCell = () => {
  return {
    actionCellWrapper: css`
      label: actionCellWrapper;
      display: flex;
      height: 24px;
    `,

    actionCellButton: css`
      label: actionCellButton;
      margin-right: 0;
      width: 24px;
    `,
  };
};

export default FlameGraphTopTableContainer;
