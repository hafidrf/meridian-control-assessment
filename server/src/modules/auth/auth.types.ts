export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
};

export type PublicUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  warehouseId: string | null;
};
