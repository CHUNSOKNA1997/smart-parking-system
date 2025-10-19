import Joi from 'joi';
import constants from '../utils/constants.js';

const { PASSWORD_MIN_LENGTH } = constants;

// Register validation schema
const registerSchema = Joi.object({
  firstName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'First name is required',
      'string.min': 'First name must be at least 2 characters',
      'string.max': 'First name must not exceed 50 characters'
    }),

  lastName: Joi.string()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Last name is required',
      'string.min': 'Last name must be at least 2 characters',
      'string.max': 'Last name must not exceed 50 characters'
    }),

  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address'
    }),

  password: Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    })
});

// Login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'Password is required'
    })
});

// Email validation schema (for resend verification)
const emailSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address'
    })
});

// Reset password validation schema
const resetPasswordSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'string.empty': 'Reset token is required'
    }),

  newPassword: Joi.string()
    .min(PASSWORD_MIN_LENGTH)
    .required()
    .messages({
      'string.empty': 'New password is required',
      'string.min': `Password must be at least ${PASSWORD_MIN_LENGTH} characters`
    })
});

export {
  registerSchema,
  loginSchema,
  emailSchema,
  resetPasswordSchema
};
