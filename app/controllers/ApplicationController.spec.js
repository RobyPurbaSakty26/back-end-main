const { NotFoundError } = require('../errors');
const ApplicationController = require('./ApplicationController');

describe('AppicationCotroler', () => {
  describe('#handleGetRoot', () => {
    it('should call res.status(200 and res.json with status anda massage', async () => {
      const mockReq = {};
      const mocRes = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis(),
      };
      const applicationController = new ApplicationController();
      await applicationController.handleGetRoot(mockReq, mocRes);

      expect(mocRes.status).toHaveBeenCalledWith(200);
      expect(mocRes.json).toHaveBeenCalledWith({
        status: 'OK',
        message: 'BCR API is up and running!',
      });
    });
  });
  describe('#handleNotfound', () => {
    it('should call res status(404) and res json err', async () => {
      // moc params
      const methode = 'POTS';
      const url = 'notFound';

      const mocRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const mocReq = {
        methode,
        url,
      };

      const appContoler = new ApplicationController();
      await appContoler.handleNotFound(mocReq, mocRes);

      const err = new NotFoundError(mocRes.methode, mocReq.url);

      expect(mocRes.status).toHaveBeenCalledWith(404);
      expect(mocRes.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details || null,
        },
      });
    });
  });

  describe('#hadleEror', () => {
    it('sould call res status 500 and res json err', async () => {
      const err = new Error(' erorr ');
      const mocReq = {};
      const mocNex = jest.fn();
      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const appContoler = new ApplicationController();
      await appContoler.handleError(err, mocReq, mockRes, mocNex);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details || null,
        },
      });
    });
  });
  describe('#getOffsetFromReques', () => {
    it('sould call return offset', async () => {
      const mocReq = {
        query: {
          page: 10,
          pageSize: 20,
        },
      };
      const appContoler = new ApplicationController();
      const hasil = await appContoler.getOffsetFromRequest(mocReq);
      let count = (mocReq.query.page - 1) * mocReq.query.pageSize;
      expect(hasil).toBe(count);
    });
  });

  describe('#buldPaginationObjek', () => {
    it('sould call buildPaginationObjek return', async () => {
      const page = 1;
      const pageSize = 10;
      const mockReq = {
        query: {},
      };
      const count = 10;
      const mockCount = count;
      const appContoler = new ApplicationController();
      const hasil = await appContoler.buildPaginationObject(mockReq, mockCount);
      const pageCount = Math.ceil(mockCount / pageSize);
      expect(hasil).toEqual({
        page,
        pageCount,
        pageSize,
        count,
      });
    });
  });
});
