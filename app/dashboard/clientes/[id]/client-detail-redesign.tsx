// Componente auxiliar para exibir campo em formato de linha
const DataRow = ({ label, value, icon }: { label: string; value?: string | null; icon?: React.ReactNode }) => {
    if (!value && value !== "") return null
    
    return (
        <div className="flex items-center py-3 px-5 border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
            <div className="flex items-center gap-2 w-48 shrink-0">
                {icon && <span className="text-slate-400">{icon}</span>}
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</span>
            </div>
            <div className="flex-1">
                <span className="text-sm text-slate-900">{value || "—"}</span>
            </div>
        </div>
    )
}

// Seção com título
const Section = ({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) => (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center gap-2">
            {icon && <span className="text-slate-600">{icon}</span>}
            <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        </div>
        <div>
            {children}
        </div>
    </div>
)

export { DataRow, Section }
