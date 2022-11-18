const AuthenticationController = require('./AuthenticationController');

const { Role } = require('../models');
const { EmailAlreadyTakenError, EmailNotRegisteredError, WrongPasswordError, InsufficientAccessError } = require('../errors');
const { JWT_SIGNATURE_KEY } = require('../../config/application');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcryptjs');

const generateRandomNum = () => {
  return Math.floor(Math.random() * 10 + 1);
};

const mockUser = {
  id: 1,
  name: 'falah',
  email: 'falah nur',
  password: 'falah123',
  image: 'image',
  roleId: 1,
};
const User = {};

const mockRole = {
  id: 1,
  name: 'COSTUMER',
};

mockUser.encryptedPassword = bcrypt.hashSync(mockUser.password, 10);

const mockUserRes = {
  id: mockUser.id,
  name: mockUser.name,
  email: mockUser.email,
  encryptedPassword: mockUser.encryptedPassword,
  roleId: mockRole.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockUserModel = {
  findOne: jest.fn().mockReturnValue(null),
  create: jest.fn().mockReturnValue(mockUserRes),
};
const mockRoleModel = {
  findOne: jest.fn().mockReturnValue(mockRole),
};

describe('AuthenticationController', () => {
  describe('#decodeToken', () => {
    it('should return data user token valid', () => {
      const mockUser = {
        id: 420,
        name: 'Lala',
        email: 'lala@gmail.com',
        image: 'image',
        role: {
          id: 2,
          name: 'ADMIN',
        },
      };
      const mockToken = jwt.sign(mockUser, JWT_SIGNATURE_KEY);

      const roleModel = Role;
      const userModel = User;
      const controller = new AuthenticationController({
        userModel,
        roleModel,
        bcrypt,
        jwt,
      });

      const decodeResult = controller.decodeToken(mockToken);
      delete decodeResult['iat'];

      expect(decodeResult).toEqual(mockUser);
    });
  });

  describe('#handleRegister', () => {
    it('should return res.status(201) sucess', async () => {
      const mockReq = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleRegister(mockReq, mockRes, mockNext);

      const expectedToken = controller.createTokenFromUser(mockUserRes, mockRole);

      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: expectedToken,
      });
    });

    it('should return res.status(422) and err because email already', async () => {
      const mockReq = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue(true),
      };
      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleRegister(mockReq, mockRes, mockNext);

      const expectedErr = new EmailAlreadyTakenError(mockUser.email);

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(expectedErr);
    });

    it('should go to next function to handle general error.', async () => {
      const mockReq = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockRejectedValue(new Error('random sus error')),
      };
      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleRegister(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('#handleLogin', () => {
    it('should res.status(201) and return access token if login valid', async () => {
      const mockReq = {
        body: {
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue({
          ...mockUserRes,
          Role: mockRole,
        }),
      };

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleLogin(mockReq, mockRes, mockNext);
      const expectedToken = controller.createTokenFromUser({ ...mockUserRes, Role: mockRole }, mockRole);

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        accessToken: expectedToken,
      });
    });

    it('should res.status(404) return error email not registered.', async () => {
      const mockReq = {
        body: {
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue(null),
      };

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleLogin(mockReq, mockRes, mockNext);

      const expectedErr = new EmailNotRegisteredError(mockUser.email);

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(expectedErr);
    });

    it('should res.status(401) and return error if password wrong.', async () => {
      const mockReq = {
        body: {
          email: mockUser.email,
          password: 'sus_password',
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue({
          ...mockUserRes,
          Role: mockRole,
        }),
      };

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleLogin(mockReq, mockRes, mockNext);

      const expectedErr = new WrongPasswordError();

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(expectedErr);
    });

    it('should run next function on general error', async () => {
      const mockReq = {
        body: {
          email: mockUser.email,
          password: 'sus_password',
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockRejectedValue(new Error('whatev')),
      };

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRoleModel,
        bcrypt,
        jwt,
      });

      await controller.handleLogin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('authorize', () => {
    it('should run next function if bearer token and role valid.', async () => {
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
      const mockNext = jest.fn();

      const authorizeCustomer = controller.authorize('COSTUMER');
      await authorizeCustomer(mockReq, {}, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should res.status(401) with InsufficientAccessError .' + 'if token valid but role invalid.', async () => {
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

      const err = new InsufficientAccessError('COSTUMER');

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details || null,
        },
      });
    });

    it('should res.status(401) with error instance if token wrong.', async () => {
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

  describe('#createTokenFromUser', () => {
    it('should return jwt token', () => {
      const roleModel = Role;
      const userModel = User;
      const controller = new AuthenticationController({
        userModel,
        roleModel,
        bcrypt,
        jwt,
      });

      const token = controller.createTokenFromUser(mockUser, mockRole);
      const expectedToken = jwt.sign(
        {
          id: mockUser.id,
          name: mockUser.name,
          email: mockUser.email,
          image: mockUser.image,
          role: {
            id: mockRole.id,
            name: mockRole.name,
          },
        },
        JWT_SIGNATURE_KEY
      );

      expect(token).toEqual(expectedToken);
    });
  });

  describe('#verifyPassword', () => {
    it('should return true password', () => {
      const mockPass = 'amongus' + generateRandomNum();
      const mockHass = bcrypt.hashSync(mockPass, 10);

      const roleModel = Role;
      const userModel = User;
      const controller = new AuthenticationController({
        userModel,
        roleModel,
        bcrypt,
        jwt,
      });

      const result = controller.verifyPassword(mockPass, mockHass);
      expect(result).toEqual(true);
    });

    it('sould false password', () => {
      const mockPass = 'amongus' + generateRandomNum();
      const mockHass = bcrypt.hashSync(mockPass + 'false', 10);

      const roleModel = Role;
      const userModel = User;
      const controller = new AuthenticationController({
        userModel,
        roleModel,
        bcrypt,
        jwt,
      });

      const result = controller.verifyPassword(mockPass, mockHass);
      expect(result).toEqual(false);
    });
  });

  describe('#encryptPassword', () => {
    it('should valid ecrypt password', () => {
      const mockPass = 'hello123';

      const roleModel = Role;
      const userModel = User;
      const controller = new AuthenticationController({
        userModel,
        roleModel,
        bcrypt,
        jwt,
      });

      const resultPass = controller.encryptPassword(mockPass);

      expect(bcrypt.compareSync(mockPass, resultPass)).toEqual(true);
    });
  });
});
