"use client";

import { useState } from "react";
import {
  createCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  toggleCatalogItemActive,
} from "./actions";

type Item = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  defaultQuantity: string;
  unit: string;
  unitPrice: string;
  taxable: boolean;
  active: boolean;
};

type Labels = {
  add: string;
  edit: string;
  save: string;
  cancel: string;
  delete: string;
  confirmDelete: string;
  name: string;
  description: string;
  category: string;
  qty: string;
  unit: string;
  price: string;
  taxable: string;
  active: string;
};

function ItemRow({
  locale,
  item,
  labels,
}: {
  locale: string;
  item: Item;
  labels: Labels;
}) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <tr className="border-t border-border">
        <td className="px-3 py-2">
          <div className="font-medium">{item.name}</div>
          {item.category && (
            <div className="text-xs text-muted-foreground">{item.category}</div>
          )}
        </td>
        <td className="px-3 py-2 text-sm">{item.defaultQuantity}</td>
        <td className="px-3 py-2 text-sm">{item.unit}</td>
        <td className="px-3 py-2 text-sm">{item.unitPrice}</td>
        <td className="px-3 py-2 text-sm">{item.taxable ? "✓" : "—"}</td>
        <td className="px-3 py-2 text-sm">
          <button
            type="button"
            onClick={() => toggleCatalogItemActive(locale, item.id, !item.active)}
            className={`text-xs px-2 py-0.5 rounded ${
              item.active
                ? "bg-emerald-100 text-emerald-800"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {item.active ? labels.active : "—"}
          </button>
        </td>
        <td className="px-3 py-2 text-right space-x-2">
          <button
            onClick={() => setEditing(true)}
            className="text-xs px-2 py-1 rounded border border-border hover:bg-accent"
          >
            {labels.edit}
          </button>
          <button
            onClick={async () => {
              if (confirm(labels.confirmDelete)) {
                await deleteCatalogItem(locale, item.id);
              }
            }}
            className="text-xs px-2 py-1 rounded border border-border text-red-700 hover:bg-red-50"
          >
            {labels.delete}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-border bg-muted/30">
      <td colSpan={7} className="px-3 py-3">
        <form
          action={async (fd) => {
            await updateCatalogItem(locale, item.id, fd);
            setEditing(false);
          }}
          className="grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
        >
          <Input name="name" label={labels.name} defaultValue={item.name} required />
          <Input
            name="category"
            label={labels.category}
            defaultValue={item.category ?? ""}
          />
          <Input
            name="defaultQuantity"
            label={labels.qty}
            defaultValue={item.defaultQuantity}
            type="number"
            step="0.01"
          />
          <Input name="unit" label={labels.unit} defaultValue={item.unit} />
          <Input
            name="unitPrice"
            label={labels.price}
            defaultValue={item.unitPrice}
            type="number"
            step="0.01"
          />
          <div className="flex flex-col gap-1 text-xs">
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="taxable"
                defaultChecked={item.taxable}
              />
              {labels.taxable}
            </label>
            <label className="inline-flex items-center gap-1">
              <input
                type="checkbox"
                name="active"
                defaultChecked={item.active}
              />
              {labels.active}
            </label>
          </div>
          <div className="md:col-span-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-xs px-3 py-1.5 rounded border border-border"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground"
            >
              {labels.save}
            </button>
          </div>
        </form>
      </td>
    </tr>
  );
}

function Input({
  name,
  label,
  defaultValue,
  type = "text",
  step,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  step?: string;
  required?: boolean;
}) {
  return (
    <label className="text-xs font-medium space-y-1 block">
      <span className="text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        defaultValue={defaultValue}
        required={required}
        className="w-full px-2 py-1.5 rounded-md border border-input bg-background text-sm"
      />
    </label>
  );
}

export default function CatalogManager({
  locale,
  items,
  labels,
}: {
  locale: string;
  items: Item[];
  labels: Labels;
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-sm px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
          >
            + {labels.add}
          </button>
        )}
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createCatalogItem(locale, fd);
            setAdding(false);
          }}
          className="rounded-lg border border-border bg-card p-4 grid grid-cols-1 md:grid-cols-6 gap-2 items-end"
        >
          <Input name="name" label={labels.name} required />
          <Input name="category" label={labels.category} />
          <Input
            name="defaultQuantity"
            label={labels.qty}
            defaultValue="1"
            type="number"
            step="0.01"
          />
          <Input name="unit" label={labels.unit} defaultValue="unit" />
          <Input
            name="unitPrice"
            label={labels.price}
            defaultValue="0"
            type="number"
            step="0.01"
          />
          <div className="flex flex-col gap-1 text-xs">
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" name="taxable" defaultChecked />
              {labels.taxable}
            </label>
            <label className="inline-flex items-center gap-1">
              <input type="checkbox" name="active" defaultChecked />
              {labels.active}
            </label>
          </div>
          <div className="md:col-span-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs px-3 py-1.5 rounded border border-border"
            >
              {labels.cancel}
            </button>
            <button
              type="submit"
              className="text-xs px-3 py-1.5 rounded bg-primary text-primary-foreground"
            >
              {labels.save}
            </button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">{labels.name}</th>
              <th className="px-3 py-2 font-medium">{labels.qty}</th>
              <th className="px-3 py-2 font-medium">{labels.unit}</th>
              <th className="px-3 py-2 font-medium">{labels.price}</th>
              <th className="px-3 py-2 font-medium">{labels.taxable}</th>
              <th className="px-3 py-2 font-medium">{labels.active}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <ItemRow key={it.id} locale={locale} item={it} labels={labels} />
            ))}
          </tbody>
        </table>
        {items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">—</div>
        )}
      </div>
    </div>
  );
}
