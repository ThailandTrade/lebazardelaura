import { AddBookFlow } from "./add-flow";
import { createBookAction, sellBookAction } from "../book-actions";

export const metadata = { title: "Scanner" };

export default function ScanPage() {
  return <AddBookFlow createAction={createBookAction} sellAction={sellBookAction} />;
}
