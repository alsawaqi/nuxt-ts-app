export const createLatestRequestGate = () => {
  let sequence = 0

  return {
    begin: () => ++sequence,
    invalidate: () => ++sequence,
    isCurrent: requestId => requestId === sequence,
  }
}
