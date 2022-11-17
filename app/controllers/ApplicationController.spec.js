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
});
