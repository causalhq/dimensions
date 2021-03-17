import * as Immutable from "immutable";
import * as _ from "lodash";
import { TimeDimension } from "TimeDimension";

export function normalize<T extends { id: string }>(
  data: Immutable.List<T>
): Immutable.Map<string, T> {
  return Immutable.Map(data.map((elem) => [elem.id, elem]));
}
export function notUndefined<T>(x: T | undefined): x is T {
  return x !== undefined;
}

export function arraysEqualIgnoringOrder<T>(array1: T[], array2: T[]) {
  if (array1.length !== array2.length) return false;
  const set1 = new Set(array1);
  for (const e of array2) {
    if (!set1.has(e)) {
      return false;
    }
  }
  return true;
}

export type DimensionId = string;
export type DimensionItemId = string;

export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
};
export type DimensionMapping = {
  __typename: "DimensionMapping";
  id: Scalars["ID"];

  to_dimension_id: Scalars["ID"];
  to_dimension_item_id: Scalars["ID"];
};
export type DimensionItem = {
  __typename: "DimensionItem";
  id: Scalars["ID"];
  name: Scalars["String"];
  dimension_mappings: DimensionMapping[];
};

export type Dimension = {
  __typename: "Dimension";
  id: Scalars["ID"];
  name: Scalars["String"];
  creator_user_id: Scalars["Int"];
  dimension_items: Array<DimensionItem>;
  model_ids: Array<Scalars["Int"]>;
};

export type AllDimensions = Immutable.Map<DimensionId, Dimension>;

export type AGGREGATE_LABEL_ID = "AGGREGATE_LABEL_ID";
export const AGGREGATE_LABEL_ID: AGGREGATE_LABEL_ID = "AGGREGATE_LABEL_ID";

export const AggregateLabel: DimensionItem = {
  __typename: "DimensionItem",
  id: AGGREGATE_LABEL_ID,
  name: "Aggregate",
  dimension_mappings: [],
};

export function DimensionFactory(
  id: DimensionId,
  name: string,
  dimension_items: DimensionItem[],
  model_ids?: number[]
): Dimension {
  return {
    __typename: "Dimension",
    id,
    name,
    dimension_items,
    model_ids: model_ids ?? [],
    creator_user_id: -1,
  };
}
export function DimensionLabelFactory(
  id: DimensionItemId,
  name: string,
  dimension_mappings?: DimensionMapping[]
): DimensionItem {
  return {
    __typename: "DimensionItem",
    id,
    name,
    dimension_mappings: dimension_mappings ?? [],
  };
}
export function DimensionMappingFactory(
  id: Scalars["ID"],
  to_dimension_id: Scalars["ID"],
  to_dimension_item_id: Scalars["ID"]
): DimensionMapping {
  return {
    __typename: "DimensionMapping",
    id,
    to_dimension_id,
    to_dimension_item_id,
  };
}

export interface DimensionMap {
  [key: string /* DimensionId */]: DimensionItemId | undefined;
}

export function getDimensionIdsFromDimensionMap(
  dimensionMap: DimensionMap
): DimensionId[] {
  return Object.entries(dimensionMap)
    .map(([a, b]) => {
      if (a === undefined || b === undefined) return undefined;
      return a;
    })
    .filter(notUndefined);
}

export interface ActualMultiDimensional<T> {
  dimensionId: DimensionId;
  values: Immutable.Map<DimensionItemId, MultiDimensional<T>>;
}

export type MultiDimensional<T> = ActualMultiDimensional<T> | T;
export type MultiDimensionalExpression = MultiDimensional<string>;
export type MultiDimensionalResult = MultiDimensional<number | undefined>;

/**
 * We parse CausalExpressions to this type. It can handle group-bys, filters, and aggregations.
 *
 * Examples:
 *  - [ ["dimId", "itemId"] ] -- filter item
 *  - [ ["dimId", "itemId"], ["dimId", AGGREGATE_LABEL_ID] ] -- select item
 *  - [ ["dimId", "mappedDimId1" "mappedDimId1"], ["dimId", "itemId"] ] -- group by and filter
 *  - [ ["dimId", AGGREGATE_LABEL_ID] ] -- aggregate dimension
 */
export type AdvancedDimensionMap = Array<Array<DimensionItemId | DimensionId>>;

// ideally we would use a proper tagged union; this is used for backwards compatibility
export function hasNoDimension<T>(m: MultiDimensional<T>): m is T {
  if (typeof m !== "object" || m === null) {
    return true;
  }
  return !("values" in (m as any) && "dimensionId" in (m as any));
}

export function MultiDimensionalExpression(
  dimensionId: DimensionId,
  values: Immutable.Map<DimensionItemId, MultiDimensionalExpression>
): MultiDimensionalExpression {
  return {
    dimensionId,
    values,
  };
}

export function getAllDimensionIdsFromMultiDimensional<T>(
  expression: MultiDimensional<T> | undefined
): DimensionId[] {
  if (hasNoDimension(expression)) {
    return [];
  }

  return [
    expression.dimensionId,
    ...getAllDimensionIdsFromMultiDimensional(
      expression.values.valueSeq().toArray()[0]
    ),
  ];
}

export function mapMultiDimensional<S, T>(
  e: MultiDimensional<S>,
  mapper: (s: S) => T
): MultiDimensional<T> {
  if (hasNoDimension(e)) {
    return mapper(e);
  }
  return {
    dimensionId: e.dimensionId,
    values: e.values.map((value) => mapMultiDimensional(value, mapper)),
  };
}
export function flattenMultiDimensional<T>(e: MultiDimensional<T>): T[] {
  if (!hasNoDimension(e)) {
    return e.values.valueSeq().toArray().flatMap(flattenMultiDimensional);
  }

  return [e];
}
export function getDimensionIdsFromMultiDimensional<T>(
  e: MultiDimensional<T>
): DimensionId[] {
  if (hasNoDimension(e)) {
    return [];
  }
  const res = [
    e.dimensionId,
    ...e.values
      .valueSeq()
      .toArray()
      .flatMap(getDimensionIdsFromMultiDimensional),
  ];
  return res;
}

/**
 * Finds the value corresponding to a dimensionMap in a MultiDimensional<>; if exact is true it'll
 * only return the value that matches the dimensionMap exactly.
 *
 * @param m
 * @param map
 * @param exact
 * @param depth
 */
export function getValueFromMultiDimensional<T>(
  m: MultiDimensional<T>,
  map: DimensionMap,
  exact = false,
  depth = 0
): T | undefined {
  if (hasNoDimension(m)) {
    if (!exact || (exact && depth === Object.keys(map).length)) return m;
    return undefined;
  }
  const dimensionLabelId = map[m.dimensionId];
  if (dimensionLabelId === undefined) {
    return undefined;
  }
  const nextM = m.values.get(dimensionLabelId);
  if (nextM === undefined) {
    return undefined;
  }
  return getValueFromMultiDimensional(nextM, map, exact, depth + 1);
}

/**
 * Calls f for each dimensionMap in m. The initial caller shouldn't pass in a 3rd argument.
 *
 * @param m
 * @param f
 * @param currentDimensionMap
 */
export function iterateMultiDimensional<T>(
  m: MultiDimensional<T>,
  f: (dimensionMap: DimensionMap, value: T) => void,
  currentDimensionMap: DimensionMap = {}
) {
  if (hasNoDimension(m)) return f(currentDimensionMap, m);

  m.values.forEach((newM, dimensionItemId) =>
    iterateMultiDimensional(newM, f, {
      ...currentDimensionMap,
      [m.dimensionId]: dimensionItemId,
    })
  );
}

/**
 * Compares dimA to dimB; returns negative number if dimA < dimB, equal if dimA == dimB, and
 * positive number if dimA > dimB. Uses lexical comparison. Used for global ordering on dimensions.
 * @param dimA left dimension
 * @param dimB right dimension
 */
export function dimensionComparator(dimA: Dimension, dimB: Dimension) {
  return dimA.id.localeCompare(dimB.id);
}

/**
 * Returns true if first is a "subset" of second.
 *
 * @param first
 * @param second
 */
export function dimensionMapIsSubsetOfDimensionMap(
  first: DimensionMap,
  second: DimensionMap
) {
  return Object.keys(first).every(
    (dimensionId) => first[dimensionId] === second[dimensionId]
  );
}

/**
 * Returns the depth of a MultiDimensional (it assumes that it's balanced).
 *
 * @param m
 */
export function getMultiDimensionalDepth<T>(m: MultiDimensional<T>): number {
  if (hasNoDimension(m)) return 0;
  const first = m.values.first(undefined);
  return first === undefined ? 1 : 1 + getMultiDimensionalDepth(first);
}

/**
 * Given a dimensionMap this function returns a MultiDimensional that only has one value "along" the
 * dimensionMap.
 *
 * @param dimensionMap
 * @param value
 */
export function SimpleMultiDimensional<T>(
  dimensionMap: DimensionMap,
  value: T
): MultiDimensional<T> {
  let res: MultiDimensional<T> = value;
  Object.entries(dimensionMap).forEach(([dimensionId, dimensionItemId]) => {
    if (dimensionItemId !== undefined)
      res = { dimensionId, values: Immutable.Map([[dimensionItemId, res]]) };
  });

  return res;
}

export function printMultiDimensional<T>(m: MultiDimensional<T>) {
  if (hasNoDimension(m)) {
    console.log(m);
  } else {
    const util = require("util");
    console.log(
      util.inspect(
        { ...m, values: m.values.toJS() },
        { showHidden: false, depth: null }
      )
    );
  }
}

/**
 * Returns the following for each root dimension in `rootDimensions`:
 *  - If the root dimension does not have any group by/filter applied (it does not appear in the
 * passed `advancedDimensionMap`), returns `undefined`
 *  - If the root dimension is aggregated, ignores every other group/filter applied and returns
 * `[rootDimension.name, AggregateLabel.name]`
 *  - If the root dimension is grouped by another dimension, returns `[rootDimension.name,
 * groupByDimension.name]`
 *  - If the root dimension is filtered to only include `N` dimension items, returns
 * `[rootDimension.name, "[item1.name], [item2.name], ..., [itemN.name]"]`
 *  - If a mapped dimension is filtered to only include `N` dimension items, returns
 * `[mappedDimension.name, "[item1.name], [item2.name], ..., [itemN.name]"]`
 *  - If a dimension is both grouped and filtered, ignores the filters and returns
 * `[rootDimension.name, groupByDimension.name]`
 *  - If a dimension is filtered on multiple levels, returns `[rootDimension.name,
 * "[filteredDimension1.name] ([filteredDimensionItem1.name, ...]), ..."]`
 */
export function getLabelNamesFromDimensionMap(
  advancedDimensionMap: AdvancedDimensionMap | undefined = [],
  rootDimensions: Dimension[],
  allDimensions: AllDimensions
): Array<[string, string] | undefined> {
  const dimensionMappings: Immutable.Map<
    DimensionId,
    Array<Array<DimensionId | DimensionItemId>>
  > = Immutable.Map(
    _.groupBy(advancedDimensionMap, ([dimensionId, ...rest]) => dimensionId)
  );
  return rootDimensions.map((dimension) => {
    const mappings = dimensionMappings.get(dimension.id);

    if (mappings === undefined) {
      // no entry in advanced dimension map for this dimension
      return undefined;
    }

    // collect all aggregates/group bys/filters applied to this dimension
    // note aggregate overrides everything else, and group by overrides filters

    let hasAggregate = false;
    let groupedDimension: Dimension | undefined;
    const filterItems: Array<[DimensionId, DimensionItemId]> = mappings
      .map((path) => {
        const [itemOrDimensionId, dimensionId] = path;
        if (itemOrDimensionId === AggregateLabel.id) {
          hasAggregate = true;
          return undefined;
        }
        const maybeDimension = allDimensions.get(itemOrDimensionId);
        if (maybeDimension !== undefined) {
          // if maybeDimension is a dimension, this is a group by
          groupedDimension = maybeDimension;
          return undefined;
        } else {
          // itemOrDimensionId is an item id, this is a filter
          return [dimensionId, itemOrDimensionId] as [
            DimensionId,
            DimensionItemId
          ];
        }
      })
      .filter(notUndefined);

    if (hasAggregate) {
      return [dimension.name, AggregateLabel.name];
    } else if (groupedDimension !== undefined) {
      return [dimension.name, groupedDimension.name];
    }

    // we have filters; construct a descriptive string

    // collect all filters at same level
    const filters = _.groupBy(filterItems, ([dimId]) => dimId);
    const results = Object.entries(filters).map(([dimensionId, filters]) => {
      const dimension = allDimensions.get(dimensionId);
      const filterNames = (filters as any).map(
        ([_, dimensionItemId]) =>
          dimension?.dimension_items.find((item) => item.id === dimensionItemId)
            ?.name ?? "ILLEGAL"
      );
      return [dimension?.name ?? "ILLEGAL", filterNames.join(", ")] as [
        string,
        string
      ];
    });

    // filters are at multiple levels - format nicely
    return [
      dimension.name,
      results.map(([name, filters]) => `${name} (${filters})`).join(", "),
    ];
  });
}
/**
 * Given an array of dimension maps, aggregates them such that the resulting dimension map
 * only has the dimensions in common between all the passed dimension maps.
 * @param dimensionMaps array of dimension maps to aggregate
 */
export function aggregateDimensionMaps(
  dimensionMaps: DimensionMap[]
): DimensionMap {
  throw Error();
}

/**
 * Given a list of dimensionIds (e.g. [dimA, dimB]) this function returns the cartesian product
 * (all possible combinations) (e.g. [{dimA: 1, dimB:1},{dimA: 1, dimB:2},...]).
 * @param dimensions
 * @param dimensionIds
 * @param timeDimension
 */
export function getDimensionProduct(
  dimensions: AllDimensions,
  dimensionIds: DimensionId[],
  timeDimension: TimeDimension | null
): DimensionMap[] {
  throw Error();
}
