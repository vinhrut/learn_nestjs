export interface JwtPayload {
    sub: string;
    email: string;
    username: string;
    roles: string[];
}
export interface RefreshJwtPayload {
    sub: string;
    jti: string;
}
export interface JwtUser {
    id: string;
    email: string;
    username: string;
    roles: string[];
}
