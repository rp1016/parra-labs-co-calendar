import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

function clean(tag: string): string {
  return tag.replace(/^#+/, "").trim().toLowerCase();
}

export function TagInput({ value, onChange, placeholder, autoFocus }: Props) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = clean(draft);
    setDraft("");
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  };

  return (
    <div className="tag-input">
      {value.map((tag) => (
        <span className="tag-pill" key={tag}>
          #{tag}
          <button
            type="button"
            aria-label={`Quitar ${tag}`}
            onClick={() => onChange(value.filter((item) => item !== tag))}
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        className="tag-input-field"
        value={draft}
        autoFocus={autoFocus}
        placeholder={value.length === 0 ? placeholder : ""}
        onChange={(event) => {
          const text = event.target.value;
          if (text.includes(",")) {
            const [head, ...rest] = text.split(",");
            const tags = [...value];
            const tag = clean(head);
            if (tag && !tags.includes(tag)) tags.push(tag);
            onChange(tags);
            setDraft(rest.join(","));
          } else {
            setDraft(text);
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === "Tab") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Backspace" && !draft && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}
