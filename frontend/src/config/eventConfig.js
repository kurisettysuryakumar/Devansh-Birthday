export const eventConfig = {
  childName: "Devansh Karthikeya",
  eventName: "Wonderful Carnival of Devansh",
  eventTitle: "Wonderful Carnival of Devansh",
  occasion: "First Birthday Celebration",
  eventDate: "28 October 2026",
  date: "28 October 2026",
  time: "7:00 PM onwards",
  venueName: "Madhura Banquet Hall",
  venueLocation: "Nagole, Hyderabad",
  venue: "Madhura Banquet Hall, Nagole, Hyderabad",
  contactNumbers: ["9963011234"],
  googleMapsUrl: "https://www.google.com/maps/search/?api=1&query=Madhura+Banquet+Hall%2C+Nagole%2C+Hyderabad",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=Madhura+Banquet+Hall%2C+Nagole%2C+Hyderabad",
  preBirthdayVideoUrl: "",
  preBirthdayVideoPath: "/videos/pre-birthday-shoot.mp4",
  krishnaVideoUrl: "https://www.youtube.com/watch?v=IdOvm9vaB_8",
  krishnaVideoPath: "/videos/krishna-theme.mp4",
  eventDateTime: "2026-10-28T19:00:00+05:30",
  invitationMessage: "Thank you so much for attending Devansh Karthikeya's first birthday and making it a great success! Your love, laughter, and blessings made our celebration truly special.",
  eventDetails: [
    { label: "Birthday", value: "Devansh’s First Birthday" },
    { label: "Date", value: "28 October 2026" },
    { label: "Time", value: "7:00 PM onwards" },
    { label: "Venue", value: "Madhura Banquet Hall, Nagole, Hyderabad" }
  ],
  timeline: [
    "Welcome",
    "Guests Arrive",
    "Carnival Games & Fun",
    "Cake Cutting",
    "Family Photography",
    "Food & Celebration",
    "Music & Entertainment"
  ],
  finalHeading: "Thank You for Making It One-derful! 🎉",
  finalMessage: "Thank you so much for attending and making Devansh’s first birthday a great success. Your presence, love, and blessings mean the world to us. ❤️",
  signature: "With love,\nDevansh & Family",
  websiteUrl: "https://devansh-carnival-swarup.azurewebsites.net/"
};

// Hand-picked portraits, family moments, cake cutting, and celebration highlights.
export const featuredBirthdayPhotos = [
  { filename: "VIJ00486.JPG", title: "Our little birthday star", alt: "Devansh sitting in a white shirt and navy trousers against the colourful carnival backdrop" },
  { filename: "VIJ00608.JPG", title: "Smiles to treasure", alt: "Devansh being held by a smiling family member at his birthday celebration" },
  { filename: "VIJ00643.JPG", title: "A cuddle to remember", alt: "Devansh cuddled by a family member in a blue gown in front of the birthday backdrop" },
  { filename: "VIJ00846.JPG", title: "A little ride, a big smile", alt: "Family gathered around Devansh on his decorated birthday ride" },
  { filename: "VIJ00901.JPG", title: "Celebrating together", alt: "Devansh and family gathered around the birthday ride during the celebration" },
  { filename: "VIJ00969.JPG", title: "The carnival birthday cake", alt: "A close-up of the colourful carnival cake decorated with a lion and elephant" },
  { filename: "VIJ01043.JPG", title: "Surrounded by love", alt: "Family and guests posing together with Devansh at the carnival birthday party" },
  { filename: "VIJ01235.JPG", title: "One wonderful birthday boy", alt: "Devansh standing in a printed shirt and bow tie against the carnival backdrop" },
].map((highlight) => ({
  ...highlight,
  filename: highlight.filename.replace(/\.JPG$/, ".jpg"),
  url: `/images/devansh-birthday/previews/${highlight.filename.replace(/\.JPG$/, ".jpg")}`,
}));
