const CarController = require('./CarController');

const { Op } = require('sequelize');

const { CarAlreadyRentedError } = require('../errors');

const dayjs = require('dayjs');

const defaultMockCar = {
  id: 1,
  name: 'Lambo',
  price: 800000,
  size: 'Small',
  image: 'https://res.cloudinary.com/dtvatwzac/image/upload/v1665287959/test/kek7brwf4gzzentwzxx9.jpg',
  isCurrentlyRented: false,
  createdAt: '2022-10-14T05:11:01.429Z',
  updatedAt: '2022-10-14T05:11:01.429Z',
  userCar: null,
};

const defaultMockRes = {
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
};

const defaultMockUserCar = {
  id: 1,
  userId: 1,
  carId: 1,
  rentStartedAt: null,
  rentEndedAt: null,
  createdAt: null,
  updatedAt: null,
};

describe('CarController', () => {
  describe('#getListQueryFromRequest', () => {
    it('should return  query object ', () => {
      const availableAt = new Date().toISOString();
      const mockReq = {
        query: {
          size: 2,
          availableAt,
        },
      };

      const mockUserCarModel = {};

      const controller = new CarController({
        carModel: {},
        userCarModel: mockUserCarModel,
        dayjs,
      });

      const query = controller.getListQueryFromRequest(mockReq);

      expect(query).toEqual({
        include: {
          model: mockUserCarModel,
          as: 'userCar',
          required: false,
          where: {
            rentEndedAt: {
              [Op.gte]: availableAt,
            },
          },
        },
        where: {
          size: 2,
        },
        limit: 10,
        offset: controller.getOffsetFromRequest(mockReq),
      });
    });

    it('should return d query object and req empty.', async () => {
      const mockReq = {
        query: {},
      };

      const mockUserCarModel = {};

      const controller = new CarController({
        carModel: {},
        userCarModel: mockUserCarModel,
        dayjs,
      });

      const query = controller.getListQueryFromRequest(mockReq);

      expect(query).toEqual({
        include: {
          model: mockUserCarModel,
          as: 'userCar',
          required: false,
        },
        where: {},
        limit: 10,
        offset: controller.getOffsetFromRequest(mockReq),
      });
    });
  });

  describe('#handleGetCar', () => {
    it('should res.status(200) and return car data.', async () => {
      const mockReq = {
        params: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
      };

      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });

      await controller.handleGetCar(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(defaultMockCar);
    });
  });

  describe('#handleListCars', () => {
    it('should res.status(200) with lis cars', async () => {
      const mockReq = {
        query: {},
      };
      const mockRes = { ...defaultMockRes };

      const mockCarList = [];
      const n = 10;
      for (let i = 0; i < n; i++) {
        mockCarList.push({
          ...defaultMockCar,
          id: i + 1,
        });
      }

      const mockCarModel = {
        findAll: jest.fn().mockReturnValue(mockCarList),
        count: jest.fn().mockReturnValue(n),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });

      await controller.handleListCars(mockReq, mockRes);
      const expectedPagination = controller.buildPaginationObject(mockReq, n);

      expect(mockCarModel.findAll).toHaveBeenCalled();
      expect(mockCarModel.count).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        cars: mockCarList,
        meta: {
          pagination: expectedPagination,
        },
      });
    });
  });

  describe('#getCarFromRequest', () => {
    it('should return car by id', () => {
      const mockReq = {
        params: {
          id: 1,
        },
      };

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
      };

      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });

      const car = controller.getCarFromRequest(mockReq);

      expect(car).toEqual(defaultMockCar);
    });
  });

  describe('#handleCreateCar', () => {
    it('should res.status(201) with create success', async () => {
      const mockReq = {
        body: {
          name: defaultMockCar.name,
          price: defaultMockCar.price,
          size: defaultMockCar.size,
          image: defaultMockCar.image,
        },
      };
      const mockRes = { ...defaultMockRes };

      const mockCarModel = {
        create: jest.fn().mockReturnValue(defaultMockCar),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });
      await controller.handleCreateCar(mockReq, mockRes);

      expect(mockCarModel.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(defaultMockCar);
    });

    it('should res.status(422) err', async () => {
      const mockReq = {
        body: {
          name: defaultMockCar.name,
          price: defaultMockCar.price,
          size: defaultMockCar.size,
          image: defaultMockCar.image,
        },
      };
      const mockRes = { ...defaultMockRes };
      const err = new Error('Sus error');

      const mockCarModel = {
        create: jest.fn().mockRejectedValue(err),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });
      await controller.handleCreateCar(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
        },
      });
    });
  });

  describe('#handleRentCar', () => {
    it('should res.status(201) sueccess.', async () => {
      const rentStartedAt = new Date().toISOString();
      const rentEndedAt = dayjs(rentStartedAt).add(1, 'day');
      const mockReq = {
        body: {
          rentStartedAt,
          rentEndedAt: null,
        },
        params: {
          id: 1,
        },
        user: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };
      const mockNext = jest.fn();
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
      };
      const mockUserCarModel = {
        findOne: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue({
          ...defaultMockUserCar,
          rentStartedAt,
          rentEndedAt,
        }),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs,
      });

      await controller.handleRentCar(mockReq, mockRes, mockNext);

      expect(mockUserCarModel.create).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        ...defaultMockUserCar,
        rentStartedAt,
        rentEndedAt,
      });
    });

    it('should res.status(422) with err', async () => {
      const rentStartedAt = new Date().toISOString();
      const rentEndedAt = dayjs(rentStartedAt).add(1, 'day');
      const mockReq = {
        body: {
          rentStartedAt,
          rentEndedAt: null,
        },
        params: {
          id: 1,
        },
        user: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };
      const mockNext = jest.fn();
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
      };
      const mockUserCarModel = {
        findOne: jest.fn().mockReturnValue(true),
        create: jest.fn().mockReturnValue({
          ...defaultMockUserCar,
          rentStartedAt,
          rentEndedAt,
        }),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs,
      });

      await controller.handleRentCar(mockReq, mockRes, mockNext);
      const err = new CarAlreadyRentedError(defaultMockCar);

      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith(err);
    });

    it('should call next function on general error.', async () => {
      const rentStartedAt = new Date().toISOString();
      const mockReq = {
        body: {
          rentStartedAt,
          rentEndedAt: null,
        },
        params: {
          id: 1,
        },
        user: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };
      const mockNext = jest.fn();
      const mockCarModel = {
        findByPk: jest.fn().mockRejectedValue(new Error()),
      };
      const mockUserCarModel = {};
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs,
      });

      await controller.handleRentCar(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('#handleUpdateCar', () => {
    it('should res.status(200) updated car  success.', async () => {
      const mockCarReq = {
        name: defaultMockCar.name,
        price: defaultMockCar.price,
        size: defaultMockCar.size,
        image: defaultMockCar.image,
        isCurrentlyRented: defaultMockCar.isCurrentlyRented,
      };
      const mockReq = {
        body: mockCarReq,
        params: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
        update: jest.fn().mockReturnThis(),
      };
      const mockUserCarModel = {};

      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs,
      });

      await controller.handleUpdateCar(mockReq, mockRes);

      expect(mockCarModel.findByPk).toHaveBeenCalled();
      expect(mockCarModel.update).toHaveBeenCalledWith(mockCarReq, { where: { id: mockReq.params.id } });
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it('should res.status(422)  return err  general error.', async () => {
      const mockCarReq = {
        name: defaultMockCar.name,
        price: defaultMockCar.price,
        size: defaultMockCar.size,
        image: defaultMockCar.image,
        isCurrentlyRented: defaultMockCar.isCurrentlyRented,
      };
      const mockReq = {
        body: mockCarReq,
        params: {
          id: 1,
        },
      };
      const mockRes = { ...defaultMockRes };

      const err = new Error('car.update is not a function');

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(defaultMockCar),
        update: jest.fn().mockRejectedValue(err),
      };
      const mockUserCarModel = {};

      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs,
      });

      await controller.handleUpdateCar(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(422);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
        },
      });
    });
  });

  describe('#handleDeleteCar', () => {
    it('should res.status(204) on delete success.', async () => {
      const mockReq = {
        params: {
          id: 1,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnValue({
          end: jest.fn(),
        }),
      };

      const mockDestroy = jest.fn().mockReturnValue(1);
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue({
          ...defaultMockCar,
          destroy: mockDestroy,
        }),
      };

      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });
      await controller.handleDeleteCar(mockReq, mockRes);

      expect(mockDestroy).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(204);
    });

    it('should res.status(404) if car not found.', async () => {
      const mockReq = {
        params: {
          id: 1,
        },
      };
      const mockRes = {
        status: jest.fn().mockReturnValue({
          end: jest.fn(),
        }),
      };
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(false),
      };
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs,
      });
      await controller.handleDeleteCar(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });
  });
});
