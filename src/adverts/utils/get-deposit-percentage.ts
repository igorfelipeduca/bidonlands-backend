export const getDepositPercentage = (state: string) => {
  let percentage: number;
  switch (state) {
    case 'FL':
    case 'TX':
      percentage = 5;
      break;
    case 'NJ':
    case 'DE':
      percentage = 20;
      break;
    case 'PA':
    case 'WI':
    case 'OH':
    case 'AZ':
    case 'CA':
      percentage = 10;
      break;
    default:
      percentage = 10;
  }

  return percentage;
};
