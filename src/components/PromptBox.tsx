import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
// PopoverPrimitive removed — Tools links to /commands now
import * as DialogPrimitive from "@radix-ui/react-dialog"

// --- Utility ---
type ClassValue = string | number | boolean | null | undefined
function cn(...inputs: ClassValue[]): string { return inputs.filter(Boolean).join(" ") }

// --- Radix Wrappers (exact 21st.dev theme) ---
const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & { showArrow?: boolean }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn("relative z-50 max-w-[280px] rounded-md bg-popover text-popover-foreground px-1.5 py-1 text-xs animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2", className)} {...props}>
      {props.children}
      {showArrow && <TooltipPrimitive.Arrow className="-my-px fill-popover" />}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
))
TooltipContent.displayName = "TooltipContent"

// Popover removed — Tools button now links to /commands

const Dialog = DialogPrimitive.Root
const DialogPortal = DialogPrimitive.Portal
const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay ref={ref} className={cn("fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className)} {...props} />
))
DialogOverlay.displayName = "DialogOverlay"

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content ref={ref} className={cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-[90vw] md:max-w-[800px] translate-x-[-50%] translate-y-[-50%] gap-4 border-none bg-transparent p-0 shadow-none duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95", className)} {...props}>
      <div className="relative bg-card dark:bg-[#303030] rounded-[28px] overflow-hidden shadow-2xl p-1">
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 z-10 rounded-full bg-background/50 dark:bg-[#303030] p-1 hover:bg-accent dark:hover:bg-[#515151] transition-all">
          <XIcon className="h-5 w-5 text-muted-foreground dark:text-gray-200 hover:text-foreground dark:hover:text-white" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </div>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = "DialogContent"

// --- SVG Icons ---
const PlusIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 5V19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 12H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>)
const Settings2Icon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>)
const SendIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}><path d="M12 5.25L12 18.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18.75 12L12 5.25L5.25 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)
const XIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>)
const GlobeIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>)
const PencilIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>)
const MicIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>)
const PaintBrushIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg viewBox="0 0 512 512" fill="currentColor" {...props}><g><path d="M141.176,324.641l25.323,17.833c7.788,5.492,17.501,7.537,26.85,5.67c9.35-1.877,17.518-7.514,22.597-15.569l22.985-36.556l-78.377-55.222l-26.681,33.96c-5.887,7.489-8.443,17.081-7.076,26.511C128.188,310.69,133.388,319.158,141.176,324.641z"/><path d="M384.289,64.9c9.527-15.14,5.524-35.06-9.083-45.355l-0.194-0.129c-14.615-10.296-34.728-7.344-45.776,6.705L170.041,228.722l77.067,54.292L384.289,64.9z"/><path d="M164.493,440.972c14.671-20.817,16.951-48.064,5.969-71.089l-0.462-0.97l-54.898-38.675l-1.059-0.105c-25.379-2.596-50.256,8.726-64.928,29.552c-13.91,19.742-18.965,41.288-23.858,62.113c-3.333,14.218-6.778,28.929-13.037,43.05c-5.168,11.695-8.63,15.868-8.654,15.884L0,484.759l4.852,2.346c22.613,10.902,53.152,12.406,83.779,4.156C120.812,482.584,147.76,464.717,164.493,440.972z"/></g></svg>)
const TelescopeIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg viewBox="0 0 512 512" fill="currentColor" {...props}><g><path d="M452.425,202.575l-38.269-23.11c-1.266-10.321-5.924-18.596-13.711-21.947l-86.843-52.444l-0.275,0.598c-3.571-7.653-9.014-13.553-16.212-16.668L166.929,10.412l-0.236,0.543v-0.016c-3.453-2.856-7.347-5.239-11.594-7.08C82.569-10.435,40.76,14.5,21.516,59.203C2.275,103.827,12.82,151.417,45.142,165.36c4.256,1.826,8.669,3.005,13.106,3.556l-0.19,0.464l146.548,40.669c7.19,3.107,15.206,3.004,23.229,0.37l-0.236,0.566L365.55,238.5c7.819,3.366,17.094,1.125,25.502-5.082l42.957,11.909c7.67,3.312,18.014-3.548,23.104-15.362C462.202,218.158,460.11,205.894,452.425,202.575z"/><path d="M297.068,325.878c-1.959-2.706-2.25-6.269-0.724-9.25c1.518-2.981,4.562-4.846,7.913-4.846h4.468c4.909,0,8.889-3.972,8.889-8.897v-7.74c0-4.909-3.98-8.897-8.889-8.897h-85.789c-4.908,0-8.897,3.988-8.897,8.897v7.74c0,4.925,3.989,8.897,8.897,8.897h4.492c3.344,0,6.388,1.865,7.914,4.846c1.518,2.981,1.235,6.544-0.732,9.25L128.715,459.116c-3.225,4.287-2.352,10.36,1.927,13.569c4.295,3.225,10.368,2.344,13.578-1.943l107.884-122.17l4.036,153.738c0,5.333,4.342,9.691,9.691,9.691c5.358,0,9.692-4.358,9.692-9.691l4.043-153.738l107.885,122.17c3.209,4.287,9.282,5.168,13.568,1.943c4.288-3.209,5.145-9.282,1.951-13.569L297.068,325.878z"/></g></svg>)
const LightbulbIcon = (props: React.SVGProps<SVGSVGElement>) => (<svg viewBox="0 0 24 24" fill="none" {...props}><path d="M12 7C9.23858 7 7 9.23858 7 12C7 13.3613 7.54402 14.5955 8.42651 15.4972C8.77025 15.8484 9.05281 16.2663 9.14923 16.7482L9.67833 19.3924C9.86537 20.3272 10.6862 21 11.6395 21H12.3605C13.3138 21 14.1346 20.3272 14.3217 19.3924L14.8508 16.7482C14.9472 16.2663 15.2297 15.8484 15.5735 15.4972C16.456 14.5955 17 13.3613 17 12C17 9.23858 14.7614 7 12 7Z" stroke="currentColor" strokeWidth="2"/><path d="M12 4V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M18 6L19 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M20 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 5L6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 17H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>)

// --- Tools list (exact original) ---
const toolsList = [
  { id: 'createImage', name: 'Create an image', shortName: 'Image', icon: PaintBrushIcon },
  { id: 'searchWeb', name: 'Search the web', shortName: 'Search', icon: GlobeIcon },
  { id: 'writeCode', name: 'Write or code', shortName: 'Write', icon: PencilIcon },
  { id: 'deepResearch', name: 'Run deep research', shortName: 'Deep Search', icon: TelescopeIcon, extra: '5 left' },
  { id: 'thinkLonger', name: 'Think for longer', shortName: 'Think', icon: LightbulbIcon },
]

// --- PromptBox Component (exact 21st.dev theme) ---
interface AttachedFile {
  name: string
  type: string
  size: number
  preview?: string // base64 for images
  dataUrl?: string // full data URL
}

interface PromptBoxProps {
  onSend?: (message: string, image?: string | null, files?: AttachedFile[]) => void
  disabled?: boolean
  placeholder?: string
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ onSend, disabled = false, placeholder = "Message..." }, ref) => {
    const internalTextareaRef = React.useRef<HTMLTextAreaElement>(null)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [value, setValue] = React.useState("")
    const [attachedFiles, setAttachedFiles] = React.useState<AttachedFile[]>([])
    const [selectedTool, setSelectedTool] = React.useState<string | null>(null)
    const [isImageDialogOpen, setIsImageDialogOpen] = React.useState(false)
    const [dialogImage, setDialogImage] = React.useState<string | null>(null)

    // Voice recording state
    const [isRecording, setIsRecording] = React.useState(false)
    const [recordingTime, setRecordingTime] = React.useState(0)
    const recognitionRef = React.useRef<any>(null)
    const timerRef = React.useRef<ReturnType<typeof setInterval> | null>(null)

    React.useImperativeHandle(ref, () => internalTextareaRef.current!, [])

    React.useLayoutEffect(() => {
      const textarea = internalTextareaRef.current
      if (textarea) {
        textarea.style.height = "auto"
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
      }
    }, [value])

    // Cleanup on unmount
    React.useEffect(() => {
      return () => {
        if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, [])

    const handleSend = () => {
      const msg = value.trim()
      const imageFile = attachedFiles.find(f => f.type.startsWith('image/'))
      if (!msg && attachedFiles.length === 0) return
      onSend?.(msg, imageFile?.dataUrl || null, attachedFiles)
      setValue("")
      setAttachedFiles([])
      setSelectedTool(null)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      for (const file of files) {
        const reader = new FileReader()
        reader.onloadend = () => {
          const dataUrl = reader.result as string
          setAttachedFiles(prev => [...prev, {
            name: file.name,
            type: file.type,
            size: file.size,
            preview: file.type.startsWith('image/') ? dataUrl : undefined,
            dataUrl,
          }])
        }
        reader.readAsDataURL(file)
      }
      e.target.value = ""
    }

    const removeFile = (index: number) => {
      setAttachedFiles(prev => prev.filter((_, i) => i !== index))
    }

    const formatSize = (bytes: number) => {
      if (bytes < 1024) return `${bytes}B`
      if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)}KB`
      return `${(bytes / 1048576).toFixed(1)}MB`
    }

    // Voice recording using Web Speech API
    const toggleRecording = () => {
      if (isRecording) {
        // Stop
        if (recognitionRef.current) { try { recognitionRef.current.stop() } catch {} }
        setIsRecording(false)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setRecordingTime(0)
        return
      }

      // Start
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      if (!SpeechRecognition) {
        // Fallback: alert user
        alert('Speech recognition not supported in this browser. Use Chrome or Edge.')
        return
      }

      const recognition = new SpeechRecognition()
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'

      let finalTranscript = ''

      recognition.onresult = (event: any) => {
        let interim = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' '
          } else {
            interim += event.results[i][0].transcript
          }
        }
        setValue(() => finalTranscript + interim)
      }

      recognition.onerror = () => {
        setIsRecording(false)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setRecordingTime(0)
      }

      recognition.onend = () => {
        setIsRecording(false)
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
        setRecordingTime(0)
      }

      recognitionRef.current = recognition
      recognition.start()
      setIsRecording(true)
      setRecordingTime(0)
      timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    }

    const hasValue = value.trim().length > 0 || attachedFiles.length > 0
    const activeTool = selectedTool ? toolsList.find(t => t.id === selectedTool) : null
    const ActiveToolIcon = activeTool?.icon

    return (
      <div className="flex flex-col rounded-[28px] p-2 shadow-sm transition-colors bg-card border border-border cursor-text">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.xlsx,.py,.js,.ts,.html,.css" multiple />

        {/* Attached files preview */}
        {attachedFiles.length > 0 && (
          <div className="flex gap-2 px-2 pt-1 pb-1 flex-wrap">
            {attachedFiles.map((file, i) => (
              <div key={i} className="relative group">
                {file.preview ? (
                  <button type="button" onClick={() => { setDialogImage(file.preview!); setIsImageDialogOpen(true) }}>
                    <img src={file.preview} alt={file.name} className="h-14 w-14 rounded-xl object-cover border border-border" />
                  </button>
                ) : (
                  <div className="h-14 px-3 rounded-xl border border-border bg-muted flex flex-col items-center justify-center gap-0.5">
                    <span className="text-[9px] font-mono text-primary font-bold uppercase">{file.name.split('.').pop()}</span>
                    <span className="text-[8px] text-muted-foreground truncate max-w-[60px]">{file.name}</span>
                    <span className="text-[8px] text-muted-foreground">{formatSize(file.size)}</span>
                  </div>
                )}
                <button onClick={() => removeFile(i)} className="absolute -right-1.5 -top-1.5 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" aria-label="Remove">
                  <XIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image dialog */}
        {dialogImage && (
          <Dialog open={isImageDialogOpen} onOpenChange={(open) => { setIsImageDialogOpen(open); if (!open) setDialogImage(null) }}>
            <DialogContent>
              <img src={dialogImage} alt="Full size preview" className="w-full max-h-[95vh] object-contain rounded-[24px]" />
            </DialogContent>
          </Dialog>
        )}

        {/* Recording indicator */}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-500 font-semibold">Recording... {recordingTime}s</span>
            <span className="text-[10px] text-muted-foreground">Speak now — click mic again to stop</span>
          </div>
        )}

        <textarea
          ref={internalTextareaRef}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={isRecording ? "Listening..." : placeholder}
          className="custom-scrollbar w-full resize-none border-0 bg-transparent p-3 text-foreground placeholder:text-muted-foreground focus:ring-0 focus-visible:outline-none min-h-12"
        />

        <div className="mt-0.5 p-1 pt-0">
          <TooltipProvider delayDuration={100}>
            <div className="flex items-center gap-2">
              {/* Attach file */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent focus-visible:outline-none">
                    <PlusIcon className="h-6 w-6" />
                    <span className="sr-only">Attach file</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}><p>Attach image or file</p></TooltipContent>
              </Tooltip>

              {/* Explore Tools — links to /commands */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <a href="/commands" className="flex h-8 items-center gap-2 rounded-full p-2 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-none no-underline">
                    <Settings2Icon className="h-4 w-4" />
                    {!selectedTool && 'Tools'}
                  </a>
                </TooltipTrigger>
                <TooltipContent side="top" showArrow={true}><p>Explore 144 Tools</p></TooltipContent>
              </Tooltip>

              {/* Active tool pill */}
              {activeTool && (
                <>
                  <div className="h-4 w-px bg-border" />
                  <button onClick={() => setSelectedTool(null)} className="flex h-8 items-center gap-2 rounded-full px-2 text-sm hover:bg-accent cursor-pointer text-primary transition-colors">
                    {ActiveToolIcon && <ActiveToolIcon className="h-4 w-4" />}
                    {activeTool.shortName}
                    <XIcon className="h-4 w-4" />
                  </button>
                </>
              )}

              {/* File count badge */}
              {attachedFiles.length > 0 && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                  {attachedFiles.length} file{attachedFiles.length > 1 ? 's' : ''}
                </span>
              )}

              {/* Right-aligned: Mic + Send */}
              <div className="ml-auto flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={toggleRecording} className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none ${isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'text-foreground hover:bg-accent'}`}>
                      <MicIcon className="h-5 w-5" />
                      <span className="sr-only">{isRecording ? 'Stop recording' : 'Record voice'}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}><p>{isRecording ? 'Stop recording' : 'Voice input'}</p></TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" onClick={handleSend} disabled={!hasValue || disabled} className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground">
                      <SendIcon className="h-6 w-6" />
                      <span className="sr-only">Send message</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" showArrow={true}><p>Send</p></TooltipContent>
                </Tooltip>
              </div>
            </div>
          </TooltipProvider>
        </div>
      </div>
    )
  }
)
PromptBox.displayName = "PromptBox"
