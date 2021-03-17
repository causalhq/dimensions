import * as Immutable from "immutable";
import * as _ from "lodash";
import {
  aggregateDimensionMaps,
  AggregateLabel,
  DimensionFactory,
  DimensionLabelFactory,
  DimensionMap,
  dimensionMapIsSubsetOfDimensionMap,
  DimensionMappingFactory,
  getAllDimensionIdsFromMultiDimensional,
  getDimensionProduct,
  getLabelNamesFromDimensionMap,
  getMultiDimensionalDepth,
  iterateMultiDimensional,
  MultiDimensional,
  MultiDimensionalExpression,
  normalize,
  SimpleMultiDimensional,
} from "./Dimension";

const earth = DimensionLabelFactory("earth", "Earth");
const mars = DimensionLabelFactory("mars", "Mars");
const planetDimension = DimensionFactory("planet", "Planet", [earth, mars]);

const europe = DimensionLabelFactory("europe", "Europe", [
  DimensionMappingFactory("europe_planet", planetDimension.id, earth.id),
]);
const usa = DimensionLabelFactory("usa", "USA", [
  DimensionMappingFactory("usa_planet", planetDimension.id, earth.id),
]);
const regionDimension = DimensionFactory("region", "Region", [europe, usa]);

const germany = DimensionLabelFactory("germany", "Germany", [
  DimensionMappingFactory("germany_region", regionDimension.id, europe.id),
]);
const poland = DimensionLabelFactory("poland", "Poland", [
  DimensionMappingFactory("poland_region", regionDimension.id, europe.id),
]);
const countryDimension = DimensionFactory("country", "Country", [
  germany,
  poland,
]);

const google = DimensionLabelFactory("google", "Google");
const facebook = DimensionLabelFactory("facebook", "Facebook");
const linkedin = DimensionLabelFactory("linkedin", "LinkedIn");
const adsDimension = DimensionFactory("ads", "Ads", [
  google,
  facebook,
  linkedin,
]);
const dimensions = normalize(Immutable.List.of(countryDimension));
const twoDimensions = normalize(
  Immutable.List.of(countryDimension, adsDimension)
);
const allDimensions = normalize(
  Immutable.List.of(
    countryDimension,
    adsDimension,
    regionDimension,
    regionDimension,
    planetDimension
  )
);

describe("records/Dimension", () => {
  describe.skip("aggregateDimensionMaps", () => {
    test("one dimension", () => {
      expect(
        aggregateDimensionMaps([{ country: "england", product: "freemium" }])
      ).toEqual({
        country: "england",
        product: "freemium",
      });
      expect(
        aggregateDimensionMaps([
          { country: "england", product: "freemium" },
          { country: "england", product: "freemium" },
        ])
      ).toEqual({
        country: "england",
        product: "freemium",
      });
    });
    test("more dimensions", () => {
      expect(
        aggregateDimensionMaps([
          { country: "england", product: "freemium" },
          { country: "england", product: "enterprise" },
        ])
      ).toEqual({
        country: "england",
      });
      expect(
        aggregateDimensionMaps([
          { country: "england", product: "freemium", season: "fall" },
          { country: "england", product: "freemium", season: "winter" },
        ])
      ).toEqual({
        country: "england",
        product: "freemium",
      });
      expect(
        aggregateDimensionMaps([
          { country: "england", product: "enterprise", season: "fall" },
          { country: "england", product: "freemium", season: "winter" },
          { country: "england", product: "freemium", season: "summer" },
        ])
      ).toEqual({
        country: "england",
      });
      expect(
        aggregateDimensionMaps([
          { country: "england", product: "freemium", season: "fall" },
          { country: "us", product: "enterprise", season: "winter" },
        ])
      ).toEqual({});
      expect(
        aggregateDimensionMaps([
          { country: "england" },
          { product: "freemium" },
        ])
      ).toEqual({});
    });
  });

  describe("dimensionMapIsSubsetOfDimensionMap", () => {
    test("true", () => {
      expect(dimensionMapIsSubsetOfDimensionMap({}, {})).toBe(true);
      expect(dimensionMapIsSubsetOfDimensionMap({}, { a: "a", b: "b" })).toBe(
        true
      );
      expect(
        dimensionMapIsSubsetOfDimensionMap({ a: "a" }, { a: "a", b: "b" })
      ).toBe(true);
      expect(
        dimensionMapIsSubsetOfDimensionMap(
          { a: "a", b: "b" },
          { a: "a", b: "b" }
        )
      ).toBe(true);
    });
    test("false", () => {
      expect(
        dimensionMapIsSubsetOfDimensionMap(
          { a: "b", b: "b" },
          { a: "a", b: "b" }
        )
      ).toBe(false);
      expect(
        dimensionMapIsSubsetOfDimensionMap(
          { a: "a", b: "b", c: "c" },
          { a: "a", b: "b" }
        )
      ).toBe(false);
      expect(
        dimensionMapIsSubsetOfDimensionMap({ c: "c" }, { a: "a", b: "b" })
      ).toBe(false);
    });
  });

  test("getAllDimensionIdsFromMultiDimensional", () => {
    expect(getAllDimensionIdsFromMultiDimensional("test")).toEqual([]);
    expect(
      getAllDimensionIdsFromMultiDimensional(
        MultiDimensionalExpression(
          "product",
          Immutable.Map({
            freemium: "2",
            enterprise: "3",
          })
        )
      )
    ).toEqual(["product"]);
  });

  test.skip("getDimensionProduct", () => {
    expect(getDimensionProduct(dimensions, [], null)).toEqual([{}]);
    expect(getDimensionProduct(dimensions, ["country"], null)).toEqual([
      { country: "germany" },
      { country: "poland" },
    ]);
    expect(getDimensionProduct(twoDimensions, ["country"], null)).toEqual([
      { country: "germany" },
      { country: "poland" },
    ]);
    expect(
      getDimensionProduct(twoDimensions, ["country", "ads"], null)
    ).toEqual([
      {
        country: "germany",
        ads: "google",
      },
      {
        country: "germany",
        ads: "facebook",
      },
      {
        country: "germany",
        ads: "linkedin",
      },
      {
        country: "poland",
        ads: "google",
      },
      {
        country: "poland",
        ads: "facebook",
      },
      {
        country: "poland",
        ads: "linkedin",
      },
    ]);
  });

  describe.skip("getLabelNamesFromDimensionMap", () => {
    test("not aggregate one dimension", () => {
      expect(
        getLabelNamesFromDimensionMap([], [countryDimension], allDimensions)
      ).toEqual([undefined]);
    });
    test("not aggregate two dimensions", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [],
          [countryDimension, adsDimension],
          allDimensions
        )
      ).toEqual([undefined, undefined]);
    });
    test("aggregated with one dimension", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [["country", AggregateLabel.id]],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Country", AggregateLabel.name]]);
    });
    test("aggregated with two dimensions", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", AggregateLabel.id],
            ["ads", AggregateLabel.id],
          ],
          [countryDimension, adsDimension],
          allDimensions
        )
      ).toEqual([
        ["Country", AggregateLabel.name],
        ["Ads", AggregateLabel.name],
      ]);
    });
    test("filters set with one dimension", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", "germany"],
            ["country", "poland"],
          ],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Country", "Germany, Poland"]]);
    });
    test("aggregated with two dimensions", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", "germany"],
            ["country", "poland"],
            ["ads", "google"],
          ],
          [countryDimension, adsDimension],
          allDimensions
        )
      ).toEqual([
        ["Country", "Germany, Poland"],
        ["Ads", "Google"],
      ]);
    });
    test("with mapped dimension", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [["ads", "country"]],
          [adsDimension],
          allDimensions
        )
      ).toEqual([["Ads", "Country"]]);
      expect(
        getLabelNamesFromDimensionMap(
          [["ads", "country", "poland"]],
          [adsDimension],
          allDimensions
        )
      ).toEqual([["Country", "Poland"]]);
      expect(
        getLabelNamesFromDimensionMap(
          [["country", "ads", "google"]],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Ads", "Google"]]);
    });
    test("should return only first entry for each rootDimension", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["ads", "country", "poland"],
            ["ads", "country", "germany"],
          ],
          [adsDimension],
          allDimensions
        )
      ).toEqual([["Country", "Poland, Germany"]]);
    });
    test("multiple labels for multiple dimensions", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["ads", "country", "poland"],
            ["ads", "country", "germany"],
            ["country", "planet", AggregateLabel.id],
          ],
          [adsDimension, countryDimension],
          allDimensions
        )
      ).toEqual([
        ["Country", "Poland, Germany"],
        ["Country", AggregateLabel.name],
      ]);
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["ads", "facebook"],
            ["ads", "linkedin"],
            ["country", "planet", "earth"],
            ["country", "planet", "mars"],
          ],
          [adsDimension, countryDimension],
          allDimensions
        )
      ).toEqual([
        ["Ads", "Facebook, LinkedIn"],
        ["Planet", "Earth, Mars"],
      ]);
    });

    test("group by and filter", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", "planet"],
            ["country", "usa"],
            ["country", "poland"],
          ],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Country", "Planet"]]);
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", "planet"],
            ["country", "planet", "earth"],
            ["country", "planet", "mars"],
          ],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Country", "Planet"]]);
    });

    test("multiple filters", () => {
      expect(
        getLabelNamesFromDimensionMap(
          [
            ["country", "planet", "earth"],
            ["country", "germany"],
            ["country", "poland"],
          ],
          [countryDimension],
          allDimensions
        )
      ).toEqual([["Country", "Planet (Earth), Country (Germany, Poland)"]]);
    });
  });

  describe("getMultiDimensionalDepth", () => {
    test("0", () => {
      expect(getMultiDimensionalDepth(1)).toBe(0);
      expect(getMultiDimensionalDepth("9999")).toBe(0);
      expect(getMultiDimensionalDepth({ a: 2 })).toBe(0);
    });
    test("1", () => {
      expect(
        getMultiDimensionalDepth({
          dimensionId: "aaa",
          values: Immutable.Map([]),
        })
      ).toBe(1);
    });
  });

  describe("iterateMultiDimensional", () => {
    test("simple", () => {
      const list: Array<[DimensionMap, number]> = [];
      const m: MultiDimensional<number> = {
        dimensionId: "dimid",
        values: Immutable.Map([
          ["label1", 1],
          ["label2", 2],
        ]),
      };
      iterateMultiDimensional(m, (dimensionMap, value) => {
        list.push([dimensionMap, value]);
      });
      expect(list).toEqual([
        [{ dimid: "label1" }, 1],
        [{ dimid: "label2" }, 2],
      ]);
    });
  });

  describe("SimpleMultiDimensional", () => {
    test("depth 0", () => {
      expect(SimpleMultiDimensional({}, 1)).toEqual(1);
    });
    test("depth 1", () => {
      expect(SimpleMultiDimensional({ dim1: "label1" }, 1)).toEqual({
        dimensionId: "dim1",
        values: Immutable.Map([["label1", 1]]),
      });
    });
    test("depth 2", () => {
      const res = SimpleMultiDimensional({ dim1: "label1", dim2: "label2" }, 1);
      expect(
        _.isEqual(res, {
          dimensionId: "dim1",
          values: Immutable.Map([
            [
              "label1",
              { dimensionId: "dim2", values: Immutable.Map([["label2", 1]]) },
            ],
          ]),
        }) ||
          _.isEqual(res, {
            dimensionId: "dim2",
            values: Immutable.Map([
              [
                "label2",
                { dimensionId: "dim1", values: Immutable.Map([["label1", 1]]) },
              ],
            ]),
          })
      ).toBe(true);
    });
  });
});
