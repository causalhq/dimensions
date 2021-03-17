import * as moment from "moment";

export enum Granularity {
  Day = "Day",
  Week = "Week",
  Month = "Month",
  Quarter = "Quarter",
  Year = "Year",
}

export const NOW = "NOW";
export type DateOrNow = Date | typeof NOW;

export interface ITimeDimension {
  start: DateOrNow; // not used yet but might be useful in the future
  end: DateOrNow;
  granularity: Granularity;
}

// webpack breaks if we use dateFromString here - no idea why :(
export const defaultTimeDimension: ITimeDimension = {
  start: moment.utc().startOf("month").toDate(),
  end: moment.utc().startOf("month").add(1, "years").toDate(),
  granularity: Granularity.Month,
};
export class TimeDimension {
  // These are the original fields passed to the constructor, which we keep
  // around for serialisation.  Their use outside of this class is questionable!
  public start: DateOrNow;
  public end: DateOrNow;
  public granularity: Granularity;

  // These are derived from the fields above and not serialised.
  private numTimeSteps: number;

  /**
   * If either `values.start` or `values.end` is NOW, they get materialised by
   * this constructor so that the class returns the same results throughout its
   * lifetime.  However, the original values passed to the constructor are
   * recorded and used in serialisation, so if such a TimeDimension gets
   * serialised it will still have the NOW values.
   */
  public constructor(values?: Partial<ITimeDimension>) {
    // Record these for serialisation
    this.start = values?.start ?? defaultTimeDimension.start;
    this.end = values?.end ?? defaultTimeDimension.end;
    this.granularity = values?.granularity ?? defaultTimeDimension.granularity;

    this.numTimeSteps = 10; //
  }
  public getNumTimeSteps() {
    return this.numTimeSteps;
  }
}
