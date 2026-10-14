import { redirect } from "next/navigation";

// Self-serve signup is retired. app.leadscoreai.com is now the client sign-in;
// marketing / done-for-you lives on leadscoreai.com. Existing accounts are
// untouched — they log in here as before.
export default function HomePage() {
  redirect("/login");
}
