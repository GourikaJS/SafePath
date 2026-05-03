import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
  window.localStorage.clear();
});

test("renders landing screen with login by default", () => {
  render(<App />);

  expect(
    screen.getByRole("heading", { name: /log in to safepath/i })
  ).toBeInTheDocument();
});
