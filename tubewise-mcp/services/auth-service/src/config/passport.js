const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const { User } = require('../models');

// Configure Passport JWT strategy
const configurePassport = (passport) => {
  const options = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET || 'your-secret-key'
  };
  
  passport.use(new JwtStrategy(options, async (payload, done) => {
    try {
      // Find user by ID from JWT payload
      const user = await User.findByPk(payload.id);
      
      if (user) {
        return done(null, user);
      }
      
      return done(null, false);
    } catch (error) {
      console.error('Passport error:', error);
      return done(error, false);
    }
  }));
};

module.exports = { configurePassport };
