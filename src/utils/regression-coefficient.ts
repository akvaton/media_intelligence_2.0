export const calculateRegressionCoefficient = (
  analyzedFragment: Array<{ x: number; y: number }>,
) => {
  const result = analyzedFragment.reduce(
    (accumulator, currentItem) => {
      accumulator.xSum += currentItem.x;
      accumulator.ySum += currentItem.y;
      accumulator.xySum += currentItem.y * currentItem.x;
      accumulator.x2Sum += Math.pow(currentItem.x, 2);
      accumulator.xAverage = accumulator.xSum / analyzedFragment.length;

      return accumulator;
    },
    { xSum: 0, ySum: 0, xySum: 0, x2Sum: 0, xAverage: 0, yAverage: 0 },
  );
  const { xSum, ySum, xySum, x2Sum, xAverage } = result;
  const coefficient =
    ((xSum / xAverage) * xySum - xSum * ySum) /
    ((xSum / xAverage) * x2Sum - Math.pow(xSum, 2));

  return isNaN(coefficient) ? -1 : coefficient;
};
