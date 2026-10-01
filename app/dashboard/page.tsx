import React from 'react'
import AddNewButton from '@/modules/dashboard/components/add-new'
import AddRepo from '@/modules/dashboard/components/add-new-repo'
import {getAllPlaygroundForUser} from '@/modules/dashboard/actions'
import ProjectTable from '@/modules/dashboard/components/project-table'
import EmptyState from '@/modules/dashboard/components/empty-state'
import {deletePlayground ,editProjectById,duplicateProjectById} from '@/modules/dashboard/actions'





const Page = async() => {
    const playgrounds = await getAllPlaygroundForUser()
  return (
    <div className='flex flex-col justify-start items-center min-h-screen mx-auto max-w-7xl px-4 py-8'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6 w-full'>
            <AddNewButton/>
            <AddRepo/>
        </div>
        <div className='mt-10 flex flex-col justify-center items-center w-full'>
             {playgrounds && playgrounds.length === 0 ? (
          <EmptyState />
        ) : (
          
          <ProjectTable
           //@ts-ignore
            projects={playgrounds || []}
            onDeleteProject={deletePlayground}
            onUpdateProject={editProjectById}
            //@ts-ignore
            onDuplicateProject={duplicateProjectById}
          />
        )}

        </div>
    </div>
  )
}

export default Page