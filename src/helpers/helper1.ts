import jwt from "jsonwebtoken";
import ms from "ms";
export const genAccessToken = function (user: {
  id: number;
  username: string;
  email: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY as ms.StringValue,
    }
  );
};
export const genRefreshToken = function (user: { id: number }): string {
  return jwt.sign(
    {
      id: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY as ms.StringValue,
    }
  );
};
