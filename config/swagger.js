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
    },
    '/api/kyc/upload': {
      post: {
        tags: ['KYC Documents'],
        summary: 'Submit a new KYC document with file upload',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                required: ['documentType', 'document'],
                properties: {
                  documentType: {
                    type: 'string',
                    enum: ['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document']
                  },
                  document: {
                    type: 'string',
                    format: 'binary',
                    description: 'Document file (PDF, JPG, PNG, etc.)'
                  },
                  thumbnail: {
                    type: 'string',
                    format: 'binary',
                    description: 'Optional thumbnail image'
                  },
                  documentNumber: {
                    type: 'string',
                    maxLength: 100
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'KYC document submitted successfully'
          },
          '400': {
            description: 'Validation error or business logic error'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      }
    },
    '/api/kyc': {
      post: {
        tags: ['KYC Documents'],
        summary: 'Submit a new KYC document with URL',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['documentType', 'documentUrl'],
                properties: {
                  documentType: {
                    type: 'string',
                    enum: ['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document']
                  },
                  documentNumber: {
                    type: 'string',
                    maxLength: 100
                  },
                  documentUrl: {
                    type: 'string',
                    format: 'url'
                  },
                  documentThumbnail: {
                    type: 'string',
                    format: 'url'
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date'
                  }
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'KYC document submitted successfully'
          },
          '400': {
            description: 'Validation error or business logic error'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      },
      get: {
        tags: ['KYC Documents'],
        summary: 'Get user\'s KYC documents',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Page number for pagination'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            description: 'Number of documents per page'
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'expired'] },
            description: 'Filter by document status'
          },
          {
            in: 'query',
            name: 'documentType',
            schema: { type: 'string', enum: ['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'] },
            description: 'Filter by document type'
          }
        ],
        responses: {
          '200': {
            description: 'List of user\'s KYC documents'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      }
    },
    '/api/kyc/{documentId}': {
      get: {
        tags: ['KYC Documents'],
        summary: 'Get a specific KYC document',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'KYC document ID'
          }
        ],
        responses: {
          '200': {
            description: 'KYC document details'
          },
          '404': {
            description: 'KYC document not found'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      },
      put: {
        tags: ['KYC Documents'],
        summary: 'Update a KYC document',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'KYC document ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  documentType: {
                    type: 'string',
                    enum: ['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document']
                  },
                  documentNumber: {
                    type: 'string',
                    maxLength: 100
                  },
                  documentUrl: {
                    type: 'string',
                    format: 'url'
                  },
                  documentThumbnail: {
                    type: 'string',
                    format: 'url'
                  },
                  expiresAt: {
                    type: 'string',
                    format: 'date'
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'KYC document updated successfully'
          },
          '400': {
            description: 'Validation error or business logic error'
          },
          '404': {
            description: 'KYC document not found'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      },
      delete: {
        tags: ['KYC Documents'],
        summary: 'Delete a KYC document',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'KYC document ID'
          }
        ],
        responses: {
          '200': {
            description: 'KYC document deleted successfully'
          },
          '400': {
            description: 'Business logic error (e.g., cannot delete non-pending document)'
          },
          '404': {
            description: 'KYC document not found'
          },
          '401': {
            description: 'Unauthorized'
          }
        }
      }
    },
    '/api/kyc/admin/all': {
      get: {
        tags: ['KYC Documents - Admin'],
        summary: 'Get all KYC documents (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'page',
            schema: { type: 'integer', minimum: 1 },
            description: 'Page number for pagination'
          },
          {
            in: 'query',
            name: 'limit',
            schema: { type: 'integer', minimum: 1, maximum: 100 },
            description: 'Number of documents per page'
          },
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['pending', 'approved', 'rejected', 'expired'] },
            description: 'Filter by document status'
          },
          {
            in: 'query',
            name: 'documentType',
            schema: { type: 'string', enum: ['passport', 'national_id', 'drivers_license', 'utility_bill', 'bank_statement', 'employment_letter', 'tax_document'] },
            description: 'Filter by document type'
          },
          {
            in: 'query',
            name: 'userId',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by user ID'
          },
          {
            in: 'query',
            name: 'verifiedBy',
            schema: { type: 'string', format: 'uuid' },
            description: 'Filter by verifier ID'
          }
        ],
        responses: {
          '200': {
            description: 'List of all KYC documents'
          },
          '401': {
            description: 'Unauthorized'
          },
          '403': {
            description: 'Forbidden (not admin)'
          }
        }
      }
    },
    '/api/kyc/admin/{documentId}': {
      get: {
        tags: ['KYC Documents - Admin'],
        summary: 'Get a specific KYC document (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'KYC document ID'
          }
        ],
        responses: {
          '200': {
            description: 'KYC document details'
          },
          '404': {
            description: 'KYC document not found'
          },
          '401': {
            description: 'Unauthorized'
          },
          '403': {
            description: 'Forbidden (not admin)'
          }
        }
      }
    },
    '/api/kyc/admin/{documentId}/verify': {
      post: {
        tags: ['KYC Documents - Admin'],
        summary: 'Verify a KYC document (Admin only)',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            in: 'path',
            name: 'documentId',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'KYC document ID'
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['status'],
                properties: {
                  status: {
                    type: 'string',
                    enum: ['approved', 'rejected']
                  },
                  verificationNotes: {
                    type: 'string',
                    minLength: 10,
                    maxLength: 1000
                  },
                  rejectionReason: {
                    type: 'string',
                    minLength: 10,
                    maxLength: 1000
                  }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'KYC document verified successfully'
          },
          '400': {
            description: 'Validation error or business logic error'
          },
          '404': {
            description: 'KYC document not found'
          },
          '401': {
            description: 'Unauthorized'
          },
          '403': {
            description: 'Forbidden (not admin)'
          }
        }
      }
    },
    '/api/kyc/admin/statistics': {
      get: {
        tags: ['KYC Documents - Admin'],
        summary: 'Get KYC statistics (Admin only)',
        security: [{ BearerAuth: [] }],
        responses: {
          '200': {
            description: 'KYC statistics'
          },
          '401': {
            description: 'Unauthorized'
          },
          '403': {
            description: 'Forbidden (not admin)'
          }
        }
      }
    }
  }
};

export { specs, swaggerUi };
