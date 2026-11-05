import Wish from "../models/Wish.js";

export async function listWishes(_request, response) {
  const wishes = await Wish.find().sort({ createdAt: -1 });
  response.json(wishes);
}

export async function createWish(request, response) {
  const wish = await Wish.create(request.body);
  response.status(201).json(wish);
}
