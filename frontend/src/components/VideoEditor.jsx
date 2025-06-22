// Заглушка для VideoEditor компонента
import { useParams } from 'react-router-dom'

const VideoEditor = () => {
  const { projectId } = useParams()
  
  return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Video Editor</h2>
        <p className="text-muted-foreground">Project ID: {projectId}</p>
        <p className="text-sm text-muted-foreground mt-2">
          This component will be integrated in the main App layout
        </p>
      </div>
    </div>
  )
}

export default VideoEditor

