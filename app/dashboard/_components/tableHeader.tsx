"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, Plus, Printer, FileDown } from "lucide-react"

interface TableHeaderProps {
  title: string
  onSearch?: (value: string) => void
  onCreateNew?: () => void
  count?: number
}

export default function GenericTableHeader({ title, onSearch, onCreateNew, count }: TableHeaderProps) {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
          {count !== undefined && (
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">
              {count}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="text-gray-500 gap-2 border-none shadow-none hover:bg-transparent">
            <Printer size={16} />
          </Button>
          <Button variant="outline" size="sm" className="text-gray-500 gap-2 border-none shadow-none hover:bg-transparent">
            <FileDown size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">CSV</span>
          </Button>
          <Button variant="outline" size="sm" className="text-gray-500 gap-2 border-none shadow-none hover:bg-transparent mr-4">
            <FileDown size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">XLSX</span>
          </Button>
          
          <Button variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 rounded-xl px-6 h-10 shadow-lg shadow-blue-200" onClick={onCreateNew}>
            Create new
          </Button>
          
          <Button size="icon" variant="secondary" className="bg-blue-600 text-white rounded-xl h-10 w-10 shadow-lg shadow-blue-200 ml-2">
            <Filter size={18} />
          </Button>

          <div className="relative ml-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search" 
              className="pl-10 pr-4 py-2 w-64 bg-white border-none rounded-xl h-10 shadow-sm focus-visible:ring-1 focus-visible:ring-blue-400"
              onChange={(e) => onSearch?.(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
