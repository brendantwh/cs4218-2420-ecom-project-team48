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
let deleteProductController;
let updateProductController;

beforeAll(async () => {
  const productControllerModule = await import("./productController.js");
  createProductController = productControllerModule.createProductController;
  deleteProductController = productControllerModule.deleteProductController;
  updateProductController = productControllerModule.updateProductController;
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

// deleteProductController
describe("deleteProductController", () => {
  let mockReq;
  let mockRes;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock request and response
    mockReq = {
      params: {
        pid: "product123",
      },
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Setup productModel findByIdAndDelete chain mock
    productModel.findByIdAndDelete = jest.fn().mockReturnThis();
    productModel.select = jest.fn().mockResolvedValue({});
  });

  it("should delete product successfully", async () => {
    await deleteProductController(mockReq, mockRes);

    // Verify mongoose methods called correctly
    expect(productModel.findByIdAndDelete).toHaveBeenCalledWith("product123");
    expect(productModel.select).toHaveBeenCalledWith("-photo");

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });

  it("should handle errors when deleting product fails", async () => {
    // Mock DB error
    const mockError = new Error("Database error");
    productModel.select.mockRejectedValueOnce(mockError);

    await deleteProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      message: "Error while deleting product",
      error: mockError,
    });
  });

  it("should handle case when product is not found", async () => {
    // Mock DB query ok but no product found
    productModel.select.mockResolvedValueOnce(null);

    await deleteProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Deleted successfully",
    });
  });
});

// updateProductController
describe("updateProductController", () => {
  let mockReq;
  let mockRes;
  let mockProduct;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock product instance returned when product is found and updated
    mockProduct = {
      save: jest.fn().mockResolvedValue({}),
      photo: {
        data: Buffer.from([]),
        contentType: "",
      },
    };

    // Setup productModel findByIdAndUpdate mock
    productModel.findByIdAndUpdate = jest.fn().mockResolvedValue(mockProduct);

    // Mock request
    mockReq = {
      params: {
        pid: "product123",
      },
      fields: {
        name: "New Jeans",
        description: "New description",
        price: 25.99,
        category: "Clothing",
        quantity: 10,
        shipping: true,
      },
      files: {
        photo: {
          path: "test/path/updated-photo.jpg",
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
    fs.readFileSync.mockReturnValue(Buffer.from("mock updated image data"));
  });

  it("should update product successfully", async () => {
    await updateProductController(mockReq, mockRes);

    expect(productModel.findByIdAndUpdate).toHaveBeenCalledWith(
      "product123",
      {
        ...mockReq.fields,
        slug: expect.any(String),
      },
      { new: true }
    );
    expect(mockProduct.save).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Updated Successfully",
      products: expect.any(Object),
    });
  });

  it("should return error when name is missing", async () => {
    mockReq.fields.name = "";

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "Name is Required",
    });
  });

  it("should return error when photo size exceeds 1MB", async () => {
    mockReq.files.photo.size = 1500000; // 1.5MB

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      error: "photo is Required and should be less then 1mb", // yes this is misspelled
    });
  });

  it("should handle database errors", async () => {
    const mockError = new Error("Database error");
    productModel.findByIdAndUpdate.mockRejectedValueOnce(mockError);

    await updateProductController(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: false,
      error: mockError,
      message: "Error in Updte product", // yes this is misspelled
    });
  });

  it("should update product without photo if no photo provided", async () => {
    mockReq.files = {};

    await updateProductController(mockReq, mockRes);

    expect(fs.readFileSync).not.toHaveBeenCalled();
    expect(mockProduct.save).toHaveBeenCalled();
    expect(mockRes.status).toHaveBeenCalledWith(201);
    expect(mockRes.send).toHaveBeenCalledWith({
      success: true,
      message: "Product Updated Successfully",
      products: expect.any(Object),
    });
  });

  it("should validate required fields", async () => {
    const requiredFields = [
      "name",
      "description",
      "price",
      "category",
      "quantity",
    ];

    // Testing each required field
    for (const field of requiredFields) {
      // Reset req for each iteration
      mockReq.fields = {
        name: "New Jeans",
        description: "New description",
        price: 25.99,
        category: "Clothing",
        quantity: 10,
        shipping: true,
      };

      mockReq.fields[field] = "";

      await updateProductController(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.send).toHaveBeenCalledWith({
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} is Required`,
      });

      mockRes.status.mockClear();
      mockRes.send.mockClear();
    }
  });
});
