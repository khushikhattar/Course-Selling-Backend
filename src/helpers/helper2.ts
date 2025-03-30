import jwt from "jsonwebtoken";
import ms from "ms";
export const genAccessToken = function (admin: {
  id: number;
  adminname: string;
  email: string;
}): string {
  return jwt.sign(
    {
      id: admin.id,
      name: admin.adminname,
      email: admin.email,
    },
    process.env.ADMIN_ACCESS_TOKEN_SECRET as string,
    { expiresIn: process.env.ADMIN_ACCESS_TOKEN_EXPIRY as ms.StringValue }
  );
};

export const genRefreshToken = function (admin: { id: number }): string {
  return jwt.sign(
    {
      id: admin.id,
    },
    process.env.ADMIN_REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: process.env.ADMIN_REFRESH_TOKEN_EXPIRY as ms.StringValue,
    }
  );
};
