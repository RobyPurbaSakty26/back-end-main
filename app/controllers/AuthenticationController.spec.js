const AuthenticationController = require('./AuthenticationController');
const { Role } = require('../models');
const { JWT_SIGNATURE_KEY } = require('../../config/application');
const { EmailAlreadyTakenError, EmailNotRegisteredError, WrongPasswordError, InsufficientAccessError, RecordNotFoundError } = require('../errors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const mockRole = {
  id: 1,
  name: 'CUSTOMER',
};

const mockUser = {
  id: 4,
  name: 'tomas',
  email: 'tomas@gmail.com',
  password: 'rahasia',
  image: 'image',
  roleId: 1,
};

mockUser.encpript = bcrypt.hashSync(mockUser.password, 10);

const mockUserRes = {
  id: mockUser.id,
  name: mockUser.name,
  email: mockUser.email,
  encpript: mockUser.encpript,
  roleId: mockRole.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserModel = {
  findOne: jest.fn().mockReturnValue(null),
  create: jest.fn().mockReturnValue(mockRole),
};

const mockRuleModel = {
  findOne: jest.fn().mockReturnValue(mockRole),
};

const User = {};

describe('authorize', () => {
  it('should nex function if valid token', async () => {
    const roleModel = Role;
    const userModel = User;
    const controller = new AuthenticationController({
      roleModel,
      userModel,
      bcrypt,
      jwt,
    });
    const mockRes = {};
    const mockToken = controller.createTokenFromUser(mockUser, mockRole);
    const mockReq = {
      headers: {
        authorization: 'Bearer ' + mockToken,
      },
    };
    const mockNext = jest.fn();

    const authorizeCustomer = controller.authorize('CUSTOMER');
    await authorizeCustomer(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should res.status(401) err invalid with err detail', async () => {
    const roleModel = Role;
    const userModel = User;
    const controller = new AuthenticationController({
      roleModel,
      userModel,
      bcrypt,
      jwt,
    });
    const mockToken = controller.createTokenFromUser(mockUser, mockRole);
    const mockReq = {
      headers: {
        authorization: 'Bearer ' + mockToken,
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockNext = jest.fn();

    const authorizeCustomer = controller.authorize('ADMIN');
    await authorizeCustomer(mockReq, mockRes, mockNext);

    const err = new InsufficientAccessError('CUSTOMER');

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: {
        name: err.name,
        message: err.message,
        details: err.details || null,
      },
    });
  });

  it('should res.status(401) err token ', async () => {
    const roleModel = Role;
    const userModel = User;
    const controller = new AuthenticationController({
      roleModel,
      userModel,
      bcrypt,
      jwt,
    });
    const mockToken = controller.createTokenFromUser(mockUser, mockRole);
    const mockReq = {
      headers: {
        authorization: 'Bearer ' + mockToken + 'uwu',
      },
    };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const mockNext = jest.fn();

    const authorizeCustomer = controller.authorize('ADMIN');
    await authorizeCustomer(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});
