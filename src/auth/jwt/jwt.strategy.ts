/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
// TODO resolve eslint

/* eslint-disable @typescript-eslint/no-unsafe-return */

import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import jwksRsa from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Token must be signed with RS256
      algorithms: ['RS256'],

      // Extract token only from Authorization header (Guards handle cookies)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      // Keycloak issuer validation
      issuer: `${process.env.KC_URL}/realms/${process.env.KC_REALM}`,

      // JWKS provider (AUTO ROTATION, AUTO CACHING)
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        cacheMaxEntries: 5,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri: `${process.env.KC_URL}/realms/${process.env.KC_REALM}/protocol/openid-connect/certs`,
      }),
    });
  }

  // The payload is already validated here
  validate(payload: any) {
    return payload;
  }
}
