import { SidebarProvider } from "@/components/ui/sidebar";
import { getAllPlaygroundForUser } from "@/modules/dashboard/actions";
import { DashboardSidebar } from "@/modules/dashboard/components/dashboard-sidebar";


export default async function DashboardLayout({
    children
}:{
    children:React.ReactNode
}){
    //fetching from backend
    const playgroundData = await getAllPlaygroundForUser()
    

    //for giving attractive logos while working on seperate playground like fire for hono etc

    const technologyIconMap:Record<string,string> = {
        REACT:"Zap",
        NEXTJS:"Lightbulb",
        EXPRESS:"Database",
        VUE:"Compass",
        HONO:"FlameIcon",
        ANGULAR:"Terminal"
    }

  const formattedPlaygroundData = playgroundData?.map((item)=>({
    id:item.id,
    name:item.title,
    
    starred:false,
    icon:technologyIconMap[item.template] || "Code2" //code2 for default for template not found
  })) ?? [];
        
    return(
        <SidebarProvider>
        <div className="flex min-h-scrren w-full overflow-x-hidden">
            {/* Dashboard Sidebar */}
        
            <DashboardSidebar initialPlaygroundData={formattedPlaygroundData}/> 

            <main className="flex-1">
                {children}
            </main>

        </div>
    </SidebarProvider>
    )
}