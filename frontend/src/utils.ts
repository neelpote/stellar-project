import * as StellarSdk from '@stellar/stellar-sdk';

export const toNumber = (value: number | bigint): number => {
  return typeof value === 'bigint' ? Number(value) : value;
};

export const calculatePercentage = (numerator: number | bigint, denominator: number | bigint): number => {
  const num = toNumber(numerator);
  const den = toNumber(denominator);
  return den > 0 ? Math.round((num / den) * 100) : 0;
};

export const formatTimeRemaining = (endTime: number | bigint): string => {
  const now = Math.floor(Date.now() / 1000);
  const endTimeNum = toNumber(endTime);
  const remaining = endTimeNum - now;

  if (remaining <= 0) return 'Ended';

  const days = Math.floor(remaining / (24 * 60 * 60));
  const hours = Math.floor((remaining % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((remaining % (60 * 60)) / 60);

  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
};

export const isVotingActive = (endTime: number | bigint): boolean => {
  const now = Math.floor(Date.now() / 1000);
  return now < toNumber(endTime);
};

export const toScVal = {
  bool: (value: boolean) => StellarSdk.xdr.ScVal.scvBool(value),
  i128: (value: number) => StellarSdk.nativeToScVal(BigInt(value), { type: 'i128' }),
  string: (value: string) => StellarSdk.nativeToScVal(value, { type: 'string' }),
  address: (value: string) => StellarSdk.Address.fromString(value).toScVal(),
};
