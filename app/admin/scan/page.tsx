import { AddBookFlow } from "./add-flow";
import { createBookAction } from "../book-actions";

export const metadata = { title: "Scanner" };

export default function ScanPage() {
  return <AddBookFlow createAction={createBookAction} />;
}
