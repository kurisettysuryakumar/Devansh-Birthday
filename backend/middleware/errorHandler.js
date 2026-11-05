export function notFound(request, response, next) {
  const error = new Error(`Route not found: ${request.method} ${request.originalUrl}`);
  error.status = 404;
  next(error);
}

export function errorHandler(error, request, response, _next) {
  let status = error.status || 500;
  let message = error.message || "An unexpected server error occurred.";

  if (error.name === "ValidationError") {
    status = 400;
    message = Object.values(error.errors).map((item) => item.message).join(", ");
  } else if (error.name === "CastError") {
    status = 400;
    message = "Invalid resource ID.";
  } else if (error.code === 11000) {
    status = 409;
    message = "A record with those details already exists.";
  } else if (status >= 500) {
    console.error(error);
    message = "An unexpected server error occurred.";
  }

  response.status(status).json({ message });
}
