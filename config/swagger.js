import swaggerUi from 'swagger-ui-express';

// Basic OpenAPI 3.0 specification
const specs = {
  openapi: '3.0.0',
  info: {
    title: 'AWARI Projects API',
    version: '1.0.0',
    description: 'Real Estate & Shortlet Platform API Documentation',
    contact: {
      name: 'AWARI Projects Team',
      email: 'support@awariprojects.com'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.API_URL || 'http://localhost:8000',
      description: 'Development server'
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for authentication'
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    '/api/auth/register': {
      post: {
        tags: ['Authentication'],
        summary: 'Register a new user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  },
                  password: {
                    type: 'string',
                    minLength: 8
                  },
                  firstName: {
                    type: 'string',
                    minLength: 2
                  },
                  lastName: {
                    type: 'string',
                    minLength: 2
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User registered successfully'
          }
        }
      }
    },
    '/api/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  },
                  password: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful'
          }
        }
      }
    },
    '/api/auth/google': {
      post: {
        tags: ['Authentication'],
        summary: 'Google Sign-In authentication using Firebase',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: {
                    type: 'string',
                    description: 'Firebase ID token from client-side authentication'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Google Sign-In successful'
          }
        }
      }
    },
    '/api/auth/link-google': {
      post: {
        tags: ['Authentication'],
        summary: 'Link Google account to existing user',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['idToken'],
                properties: {
                  idToken: {
                    type: 'string',
                    description: 'Google ID token'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Google account linked successfully'
          }
        }
      }
    },
    '/api/auth/unlink-google': {
      post: {
        tags: ['Authentication'],
        summary: 'Unlink Google account from user',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'Google account unlinked successfully'
          }
        }
      }
    },
    '/api/auth/verify-email': {
      post: {
        tags: ['Authentication'],
        summary: 'Verify user email with verification code',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'verificationCode'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  },
                  verificationCode: {
                    type: 'string',
                    minLength: 4,
                    maxLength: 4
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Email verified successfully'
          }
        }
      }
    },
    '/api/auth/resend-verification': {
      post: {
        tags: ['Authentication'],
        summary: 'Resend verification email',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Verification email sent successfully'
          }
        }
      }
    },
    '/api/auth/forgot-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Request password reset',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset email sent (if account exists)'
          }
        }
      }
    },
    '/api/auth/reset-password': {
      post: {
        tags: ['Authentication'],
        summary: 'Reset password with token',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'resetToken', 'newPassword'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  },
                  resetToken: {
                    type: 'string',
                    minLength: 6,
                    maxLength: 6
                  },
                  newPassword: {
                    type: 'string',
                    minLength: 8
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password reset successfully'
          }
        }
      }
    },
    '/api/auth/request-deletion': {
      post: {
        tags: ['Authentication'],
        summary: 'Request account deletion',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['password'],
                properties: {
                  password: {
                    type: 'string'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Deletion request sent successfully'
          }
        }
      }
    },
    '/api/auth/confirm-deletion': {
      post: {
        tags: ['Authentication'],
        summary: 'Confirm account deletion',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'deletionToken'],
                properties: {
                  email: {
                    type: 'string',
                    format: 'email'
                  },
                  deletionToken: {
                    type: 'string',
                    minLength: 6,
                    maxLength: 6
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Account deleted successfully'
          }
        }
      }
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check endpoint',
        responses: {
          '200': {
            description: 'API is running'
          }
        }
      }
    }
  }
};

export { specs, swaggerUi };
