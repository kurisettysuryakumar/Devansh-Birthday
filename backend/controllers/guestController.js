import Guest from "../models/Guest.js";

export async function listGuests(_request, response) {
  const guests = await Guest.find().sort({ createdAt: -1 });
  response.json(guests);
}

export async function createGuest(request, response) {
  const guest = await Guest.create(request.body);
  response.status(201).json(guest);
}

export async function updateGuest(request, response) {
  const guest = await Guest.findByIdAndUpdate(request.params.id, request.body, {
    new: true,
    runValidators: true,
  });
  if (!guest) return response.status(404).json({ message: "Guest not found." });
  return response.json(guest);
}

export async function deleteGuest(request, response) {
  const guest = await Guest.findByIdAndDelete(request.params.id);
  if (!guest) return response.status(404).json({ message: "Guest not found." });
  return response.status(204).end();
}
