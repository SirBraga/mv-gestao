"use client"

import * as React from "react"
import { ChevronDown, X, Search, Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
  subtitle?: string
  disabled?: boolean
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  maxVisible?: number
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "Selecione itens...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum item encontrado.",
  className,
  disabled = false,
  maxVisible = 3,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listboxRef = React.useRef<HTMLUListElement>(null)

  const filteredOptions = React.useMemo(() => {
    if (!searchQuery) return options
    const query = searchQuery.toLowerCase()
    return options.filter(option => 
      option.label.toLowerCase().includes(query) ||
      option.subtitle?.toLowerCase().includes(query)
    )
  }, [options, searchQuery])

  const selectedOptions = React.useMemo(() => {
    return options.filter(option => value.includes(option.value))
  }, [options, value])

  const handleToggle = (optionValue: string) => {
    if (value.includes(optionValue)) {
      onChange(value.filter(v => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  const handleRemove = (optionValue: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter(v => v !== optionValue))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false)
      inputRef.current?.blur()
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setIsOpen(!isOpen)
    } else if (e.key === "ArrowDown" && isOpen) {
      e.preventDefault()
      const firstOption = listboxRef.current?.querySelector('[role="option"]:not([disabled])') as HTMLElement
      firstOption?.focus()
    }
  }

  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
    }
  }, [isOpen])

  const visibleChips = selectedOptions.slice(0, maxVisible)
  const hasMoreChips = selectedOptions.length > maxVisible

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          "flex min-h-9 w-full items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm transition-colors",
          "hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
          disabled && "opacity-50 cursor-not-allowed",
          isOpen && "ring-2 ring-indigo-500 border-indigo-500"
        )}
      >
        {/* Selected chips */}
        {selectedOptions.length === 0 ? (
          <span className="text-gray-400">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-1 flex-1">
            {visibleChips.map(option => (
              <span
                key={option.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-medium"
              >
                {option.label}
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => handleRemove(option.value, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleRemove(option.value, e as any)
                    }
                  }}
                  className="rounded-full hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <X size={9} />
                </span>
              </span>
            ))}
            {hasMoreChips && (
              <span className="text-[10px] text-gray-500 font-medium">
                +{selectedOptions.length - maxVisible}
              </span>
            )}
          </div>
        )}
        
        {/* Dropdown arrow */}
        <ChevronDown 
          size={14} 
          className={cn(
            "text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
              <input
                ref={inputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 text-sm border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Options list */}
          <ul
            ref={listboxRef}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1"
          >
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-2 text-xs text-gray-400">
                {emptyMessage}
              </li>
            ) : (
              filteredOptions.map(option => {
                const isSelected = value.includes(option.value)
                return (
                  <li key={option.value}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      disabled={option.disabled}
                      onClick={() => handleToggle(option.value)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors",
                        "hover:bg-gray-50 focus:bg-gray-50 focus:outline-none",
                        isSelected && "bg-indigo-50 text-indigo-700",
                        option.disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded flex items-center justify-center shrink-0 border",
                        isSelected ? "bg-indigo-500 border-indigo-500" : "border-gray-300"
                      )}>
                        {isSelected && <Check size={10} className="text-white" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{option.label}</div>
                        {option.subtitle && (
                          <div className="text-[10px] text-gray-400 truncate">{option.subtitle}</div>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}

      {/* Close on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}
