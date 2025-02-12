import { jest } from "@jest/globals";

const productModel = jest.fn();
const fs = {
  readFileSync: jest.fn(),
};

// Use unstable_mockModule as it is ESM
jest.unstable_mockModule("../models/productModel.js", () => ({
  default: productModel,
}));

jest.unstable_mockModule("fs", () => ({
  default: fs,
}));

let createProductController;

beforeAll(async () => {
  const productControllerModule = await import("./productController.js");
  createProductController = productControllerModule.createProductController;
});

// createProductController
describe("createProductController", () => {
  let mockReq;
  let mockRes;
  let mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock product instance returned when product model is instantiated
    mockProduct = {
      save: jest.fn().mockResolvedValue({}),
      photo: {
        data: Buffer.from([]),
        contentType: "",
      },
    };

    // Setup productModel mock default implementation
    productModel.mockImplementation(() => mockProduct);

    // Mock request
    mockReq = {
      fields: {
        name: "Jeans",
        description: "Blue like other jeans",
        price: 22.07,
        category: "Clothing",
        quantity: 5,
        shipping: true,
      },
      files: {
        photo: {
          path: "test/path/photo.jpg",
          type: "image/jpeg",
          size: 500000, // 500KB
        },
      },
    };

    // Mock response
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Mock fs to return a mock buffer
    fs.readFileSync.mockReturnValue(Buffer.from("mock image data"));
  });

  it("should create product successfully", async () => {
    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Created Successfully",
      products: expect.any(Object),
    });
    expect(mockProduct.save).toHaveBeenCalled();
    expect(fs.readFileSync).toHaveBeenCalledWith("test/path/photo.jpg");
  });

  it("should return error when name is missing", async () => {
    mockReq.fields.name = "";

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Name is Required",
    });
  });

  it("should return error when description is missing", async () => {
    mockReq.fields.description = "";

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Description is Required",
    });
  });

  it("should return error when price is missing", async () => {
    mockReq.fields.price = "";

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Price is Required",
    });
  });

  it("should return error when category is missing", async () => {
    mockReq.fields.category = "";

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Category is Required",
    });
  });

  it("should return error when quantity is missing", async () => {
    mockReq.fields.quantity = "";

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Quantity is Required",
    });
  });

  it("should return error when photo size exceeds 1MB", async () => {
    mockReq.files.photo.size = 1500000; // 1.5MB

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb", // yes this is misspelled
    });
  });

  it("should handle database errors", async () => {
    const mockError = new Error("Database error");
    mockProduct.save.mockRejectedValueOnce(mockError);

    await createProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error in crearing product", // yes this is misspelled
    });
  });
});
