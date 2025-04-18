import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import CreateProduct from "./CreateProduct";
import "@testing-library/jest-dom";

jest.mock("axios");
jest.mock("react-hot-toast");

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu" />
));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("antd", () => {
  const antd = jest.requireActual("antd");

  const Select = ({ children, onChange, showSearch, ...rest }) => (
    <div>
      <select
        role="test-selection"
        onChange={(e) => onChange(e.target.value)}
        {...rest}
      >
        {children}
      </select>
    </div>
  );

  Select.Option = ({ children, value, ...rest }) => (
    <option role="test-option" value={value} {...rest}>
      {children}
    </option>
  );

  return { ...antd, Select };
});

global.URL.createObjectURL = jest.fn(() => "blob:mocked-url");

describe("CreateProduct Component", () => {
  const mockCategories = [
    { _id: "1", name: "Electronics" },
    { _id: "2", name: "Books" },
  ];

  beforeEach(() => {
    axios.get.mockResolvedValue({
      data: { success: true, category: mockCategories },
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    render(
      <MemoryRouter>
        <CreateProduct />
      </MemoryRouter>
    );
  };

  test("renders layout and admin menu", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("layout")).toBeInTheDocument();
      expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    });
  });

  test("successfully fetches and displays categories", async () => {
    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");

      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();

      expect(toast.error).not.toHaveBeenCalled();
    });
  });

  test("displays error toast category fetching API returns a failed response", async () => {
    axios.get.mockResolvedValue({
      data: { success: false, message: "Failed to get category" },
    });

    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(toast.error).toHaveBeenCalledWith("Failed to get category");
    });
  });

  test("displays error toast when fetching categories API fails", async () => {
    axios.get.mockRejectedValue(new Error("API Error"));
    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(toast.error).toHaveBeenCalledWith(
        "Something went wrong in getting category"
      );
    });
  });

  test("renders all form elements", async () => {
    renderComponent();

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /Create Product/i })
      ).toBeInTheDocument();

      expect(
        screen.getByPlaceholderText(/select a category/i)
      ).toBeInTheDocument();
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();

      expect(screen.getByText("Upload Photo")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/write a name/i)).toBeInTheDocument();

      expect(
        screen.getByPlaceholderText(/write a description/i)
      ).toBeInTheDocument();

      expect(screen.getByPlaceholderText(/write a price/i)).toBeInTheDocument();

      expect(
        screen.getByPlaceholderText(/write a quantity/i)
      ).toBeInTheDocument();

      expect(
        screen.getByPlaceholderText(/select shipping/i)
      ).toBeInTheDocument();
      expect(screen.getByText("No")).toBeInTheDocument();
      expect(screen.getByText("Yes")).toBeInTheDocument();

      expect(
        screen.getByRole("button", { name: /CREATE PRODUCT/i })
      ).toBeInTheDocument();
    });
  });

  test("updates category state on category dropdown selection", async () => {
    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Books")).toBeInTheDocument();
    });

    // get all dropdowns and select the first one (category dropdown)
    const dropdowns = screen.getAllByRole("test-selection");
    const categoryDropdown = dropdowns[0];

    fireEvent.change(categoryDropdown, { target: { value: "1" } });

    await waitFor(() => {
      expect(categoryDropdown).toHaveValue("1");
    });
  });

  test("updates shipping state on shipping dropdown selection", async () => {
    renderComponent();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
    });

    const dropdowns = screen.getAllByRole("test-selection");
    const shippingDropdown = dropdowns[1]; // 1st is category, 2nd is shipping

    fireEvent.change(shippingDropdown, { target: { value: "1" } });

    await waitFor(() => {
      expect(shippingDropdown).toHaveValue("1");
    });
  });

  test("creates product when submitting form with valid data", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Wireless Headphones" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: {
        value: "High-quality wireless headphones with noise cancellation.",
      },
    });

    fireEvent.change(screen.getByPlaceholderText("write a price"), {
      target: { value: "100" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[0]);
    const electronicsOption = await screen.findByText("Electronics");
    fireEvent.click(electronicsOption);

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[1]);
    const yesOption = await screen.findByText("Yes");
    fireEvent.click(yesOption);

    const file = new File(["test"], "test.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload Photo"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      );

      const formData = axios.post.mock.calls[0][1];
      const data = Object.fromEntries(formData.entries());
      expect(data.name).toBe("Wireless Headphones");
      expect(data.description).toBe(
        "High-quality wireless headphones with noise cancellation."
      );
      expect(data.price).toBe("100");
      expect(data.quantity).toBe("10");
      expect(data.photo.name).toBe("test.png");

      expect(toast.success).toHaveBeenCalledWith(
        "Product Created Successfully"
      );
      // redirection
      expect(mockNavigate).toHaveBeenCalledWith("/dashboard/admin/products");
    });
  });

  test("handles error when creating product returns a failed response", async () => {
    const mockErrorMessage = "Error creating product";
    axios.post.mockResolvedValue({
      data: { success: false, message: mockErrorMessage },
    });

    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Wireless Headphones" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: {
        value: "High-quality wireless headphones with noise cancellation.",
      },
    });

    fireEvent.change(screen.getByPlaceholderText("write a price"), {
      target: { value: "100" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[0]);
    const electronicsOption = await screen.findByText("Electronics");
    fireEvent.click(electronicsOption);

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[1]);
    const yesOption = await screen.findByText("Yes");
    fireEvent.click(yesOption);

    const file = new File(["test"], "test.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload Photo"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/create-product",
        expect.any(FormData)
      ); // Check that toast.error was called with the correct message
      expect(toast.error).toHaveBeenCalledWith(mockErrorMessage);
    });
  });

  test("displays error toast when API call fails", async () => {
    axios.post.mockRejectedValue(new Error("API Error"));
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Wireless Headphones" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: {
        value: "High-quality wireless headphones with noise cancellation.",
      },
    });

    fireEvent.change(screen.getByPlaceholderText("write a price"), {
      target: { value: "100" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[0]);
    const electronicsOption = await screen.findByText("Electronics");
    fireEvent.click(electronicsOption);

    fireEvent.mouseDown(screen.getAllByRole("test-selection")[1]);
    const yesOption = await screen.findByText("Yes");
    fireEvent.click(yesOption);

    const file = new File(["test"], "test.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload Photo"), {
      target: { files: [file] },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
  });

  test("handles no photo selected", async () => {
    renderComponent();

    fireEvent.change(screen.getByPlaceholderText("write a name"), {
      target: { value: "Wireless Headphones" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a description"), {
      target: {
        value: "High-quality wireless headphones with noise cancellation.",
      },
    });

    fireEvent.change(screen.getByPlaceholderText("write a price"), {
      target: { value: "100" },
    });

    fireEvent.change(screen.getByPlaceholderText("write a quantity"), {
      target: { value: "10" },
    });

    fireEvent.click(screen.getByText("CREATE PRODUCT"));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please check all fields including photo"
      );
    });
  });

  test("shows photo preview after upload", async () => {
    renderComponent();
    const file = new File(["test"], "test.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Upload Photo"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      const img = screen.getByAltText(/product_photo/i);
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute("src", expect.stringContaining("blob:"));
    });
  });
});
