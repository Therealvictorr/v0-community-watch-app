'use client'

import { useState, useEffect, useRef } from 'react'
import { LocationPicker } from '@/components/location-picker'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { User, Car, AlertTriangle, AlertCircle, MapPin, Upload, X, Image as ImageIcon } from 'lucide-react'
import type { ReportType, PersonDetails, ItemDetails } from '@/lib/types'

interface ReportFormProps {
  userId: string
}

export function ReportForm({ userId }: ReportFormProps) {
  const router = useRouter()
  const photoInput = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Common fields
  const [reportType, setReportType] = useState<ReportType>('missing_child')
  const [caseKind, setCaseKind] = useState<'missing' | 'reported_kidnapping'>('missing')
  const [lossType, setLossType] = useState<'lost' | 'stolen' | 'found'>('lost')
  const [incidentId, setIncidentId] = useState('')
  const [incidentTitle, setIncidentTitle] = useState('')
  const [incidents, setIncidents] = useState<{id:string;title:string}[]>([])
  useEffect(() => { createClient().from('case_incidents').select('id,title').eq('owner_id',userId).then(({data}) => setIncidents(data || [])) }, [userId])
  const [stateArea, setStateArea] = useState('')
  const [locality, setLocality] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [locating, setLocating] = useState(false)
  const locate = () => {
    if (!navigator.geolocation) { setError('Location is unavailable. Enter the last-seen area manually.'); return }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(position => {
      // Public last-seen coordinates are approximate, never a precise current position.
      setLatitude(position.coords.latitude.toFixed(2))
      setLongitude(position.coords.longitude.toFixed(2))
      setLocating(false)
    }, () => { setError('Could not get your location. You can enter the area manually.'); setLocating(false) }, { timeout: 10000, maximumAge: 60000 })
  }
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [lastSeenLocation, setLastSeenLocation] = useState('')
  const [lastSeenAt, setLastSeenAt] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  
  // Person details
  const [personName, setPersonName] = useState('')
  const [personAge, setPersonAge] = useState('')
  const [personGender, setPersonGender] = useState('')
  const [personHeight, setPersonHeight] = useState('')
  const [personWeight, setPersonWeight] = useState('')
  const [personHairColor, setPersonHairColor] = useState('')
  const [personEyeColor, setPersonEyeColor] = useState('')
  
  // Photo upload
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [dragActive, setDragActive] = useState(false)

  // Photo upload functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return
    
    const newFiles = Array.from(files).filter(file => {
      if (['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) {
        return file.size <= 5 * 1024 * 1024 // 5MB limit
      }
      return false
    })
    
    if (newFiles.length === 0) {
      setError('Please select image files under 5MB each')
      return
    }
    
    const totalFiles = selectedFiles.length + newFiles.length
    if (totalFiles > 5) {
      setError('Maximum 5 images allowed')
      return
    }
    
    const updatedFiles = [...selectedFiles, ...newFiles]
    setSelectedFiles(updatedFiles)
    
    // Create previews for new files
    newFiles.forEach(file => {
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreviews(prev => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(file)
    })
    
    setError(null)
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    const newPreviews = imagePreviews.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    setImagePreviews(newPreviews)
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files)
  }
  const [personClothing, setPersonClothing] = useState('')
  const [personFeatures, setPersonFeatures] = useState('')
  const [personRelationship, setPersonRelationship] = useState('')
  
  // Item details
  const [itemType, setItemType] = useState<ItemDetails['item_type']>('vehicle')
  const [itemName, setItemName] = useState('')
  const [itemMake, setItemMake] = useState('')
  const [itemModel, setItemModel] = useState('')
  const [itemYear, setItemYear] = useState('')
  const [itemColor, setItemColor] = useState('')
  const [itemLicensePlate, setItemLicensePlate] = useState('')
  const [itemDescription, setItemDescription] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (!stateArea.trim() || !locality.trim()) throw new Error('Enter the last-seen state and town / LGA.')
      if ((latitude === '') !== (longitude === '') || (latitude !== '' && (!Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || Math.abs(Number(latitude)) > 90 || Math.abs(Number(longitude)) > 180))) throw new Error('Enter a valid latitude and longitude together, or leave both empty.')
      if (lastSeenAt && new Date(lastSeenAt).getTime() > Date.now()) throw new Error('The last-seen time cannot be in the future.')
      const supabase = createClient()

      // Ensure the user profile exists (auto-creates if missing)
      await supabase
        .from('profiles')
        .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true })

      // Build person or item details based on report type
      let personDetails: PersonDetails | undefined
      let itemDetails: ItemDetails | undefined

      if (reportType === 'missing_child') {
        personDetails = {
          name: personName,
          case_kind: caseKind,
          state: stateArea.trim(),
          locality: locality.trim(),
          age: personAge ? parseInt(personAge) : undefined,
          gender: personGender || undefined,
          height: personHeight || undefined,
          weight: personWeight || undefined,
          hair_color: personHairColor || undefined,
          eye_color: personEyeColor || undefined,
          clothing_description: personClothing || undefined,
          distinguishing_features: personFeatures || undefined,
          relationship_to_reporter: personRelationship || undefined,
        }
      } else if (reportType === 'missing_item') {
        itemDetails = {
          item_type: itemType,
          loss_type: lossType === 'found' ? undefined : lossType,
          listing_kind: lossType === 'found' ? 'found' : 'missing',
          state: stateArea.trim(),
          locality: locality.trim(),
          name: itemName || undefined,
          make: itemMake || undefined,
          model: itemModel || undefined,
          year: itemYear ? parseInt(itemYear) : undefined,
          color: itemColor || undefined,
          license_plate: itemLicensePlate || undefined,
          description: itemDescription || undefined,
        }
      }

      // First create the report
      const { data: reportId, error: insertError } = await supabase.rpc('idanu_submit_case', { payload: {
          report_type: reportType,
          incident_id: reportType === 'missing_child' && caseKind === 'reported_kidnapping' ? incidentId || null : null,
          incident_title: reportType === 'missing_child' && caseKind === 'reported_kidnapping' && !incidentId ? incidentTitle || null : null,
          subject,
          description: description || null,
          person_details: personDetails || null,
          item_details: itemDetails || null,
          last_seen_location: [lastSeenLocation.trim(), locality.trim(), stateArea.trim()].filter(Boolean).join(', '),
          last_seen_lat: latitude === '' ? null : Number(Number(latitude).toFixed(2)),
          last_seen_lng: longitude === '' ? null : Number(Number(longitude).toFixed(2)),
          last_seen_at: lastSeenAt ? new Date(lastSeenAt).toISOString() : null,
          contact_name: contactName || null,
          contact_phone: contactPhone || null,
          contact_email: contactEmail || null,
        } })
      const reportData = { id: reportId }

      if (insertError) {
        setError('We could not create this case. Please try again later.')
        setLoading(false)
        return
      }

      // Upload photos if any
      if (selectedFiles.length > 0) {
        const attachmentPromises = selectedFiles.map(async (file, index) => {
          const fileName = `${reportData.id}/${Date.now()}-${index}-${file.name}`
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('report-images')
            .upload(fileName, file)

          if (uploadError) {
            console.error('Upload error:', uploadError)
            return null
          }

          const { data: publicUrlData } = supabase.storage
            .from('report-images')
            .getPublicUrl(fileName)

          return {
            report_id: reportData.id,
            filename: file.name,
            url: publicUrlData.publicUrl,
            mime_type: file.type,
            type: 'image',
            is_primary: index === 0
          }
        })

        try {
          const attachments = await Promise.all(attachmentPromises)
          const validAttachments = attachments.filter(att => att !== null)

          if (validAttachments.length > 0) {
            const { error: insertDbError } = await supabase
              .from('report_attachments')
              .insert(validAttachments)
              
            if (insertDbError) {
              console.error('Error inserting attachments into DB:', insertDbError)
            }
          }
        } catch (uploadErr) {
          console.error('Error in attachment flow:', uploadErr)
          // Don't fail the whole report if photos fail to upload
        }
      }

      router.push(`/reports/${reportData.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Type</CardTitle>
          <CardDescription>Select what you are reporting</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="missing_child" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Missing Person</span>
                <span className="sm:hidden">Person</span>
              </TabsTrigger>
              <TabsTrigger value="missing_item" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                <span className="hidden sm:inline">Missing Item</span>
                <span className="sm:hidden">Item</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {reportType === 'missing_child' ? <Field className="mt-5"><FieldLabel htmlFor="caseKind">Case category</FieldLabel><select id="caseKind" className="w-full rounded-md border p-3" value={caseKind} onChange={e => setCaseKind(e.target.value as typeof caseKind)}><option value="missing">Missing person</option><option value="reported_kidnapping">Reported kidnapping</option></select>{caseKind === 'reported_kidnapping' && <p className="text-sm text-muted-foreground">This is a reported abduction, not independent verification. Publish only a general last-seen area. Do not include possible current locations or rescue details.</p>}</Field> : <Field className="mt-5"><FieldLabel htmlFor="lossType">What happened?</FieldLabel><select id="lossType" className="w-full rounded-md border p-3" value={lossType} onChange={e => setLossType(e.target.value as typeof lossType)}><option value="lost">Lost</option><option value="stolen">Stolen</option><option value="found">I found something</option></select></Field>}
        </CardContent>
      </Card>

      {reportType === 'missing_child' && caseKind === 'reported_kidnapping' && <Card className="mb-6"><CardHeader><CardTitle>Link people from the same incident</CardTitle><CardDescription>One report per person. Link their reports to count one incident without losing individual outcomes.</CardDescription></CardHeader><CardContent className="space-y-3"><label className="block text-sm">Your existing incident<select className="block border rounded p-3 w-full" value={incidentId} onChange={e=>setIncidentId(e.target.value)}><option value="">Create a new group or leave unlinked</option>{incidents.map(i=><option key={i.id} value={i.id}>{i.title}</option>)}</select></label>{!incidentId&&<label className="block text-sm">New incident name (optional, general area only)<Input maxLength={160} minLength={3} value={incidentTitle} onChange={e=>setIncidentTitle(e.target.value)} placeholder="e.g., Chikun incident, 17 November" /></label>}</CardContent></Card>}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Provide a clear title and description</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="subject">Title *</FieldLabel>
              <Input
                id="subject"
                placeholder={
                  reportType === 'missing_child' 
                    ? "e.g., Missing: 8-year-old boy last seen at Lincoln Park" 
                    : reportType === 'missing_item'
                    ? "e.g., Stolen: Silver Toyota Camry from Main St"
                    : "e.g., Suspicious activity reported on Oak Avenue"
                }
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                placeholder="Provide any additional details that might help..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {reportType === 'missing_child' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Person Details</CardTitle>
            <CardDescription>Describe the missing person</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="personName">Full Name *</FieldLabel>
                  <Input
                    id="personName"
                    placeholder="Full name of the missing person"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="personAge">Age</FieldLabel>
                  <Input
                    id="personAge"
                    type="number"
                    placeholder="Age"
                    value={personAge}
                    onChange={(e) => setPersonAge(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel htmlFor="personGender">Gender</FieldLabel>
                  <Select value={personGender} onValueChange={setPersonGender}>
                    <SelectTrigger id="personGender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="personHeight">Height</FieldLabel>
                  <Input
                    id="personHeight"
                    placeholder={`e.g., 4'5" or 135cm`}
                    value={personHeight}
                    onChange={(e) => setPersonHeight(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="personWeight">Weight</FieldLabel>
                  <Input
                    id="personWeight"
                    placeholder="e.g., 60lbs or 27kg"
                    value={personWeight}
                    onChange={(e) => setPersonWeight(e.target.value)}
                  />
                </Field>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="personHairColor">Hair Color</FieldLabel>
                  <Input
                    id="personHairColor"
                    placeholder="e.g., Brown, curly"
                    value={personHairColor}
                    onChange={(e) => setPersonHairColor(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="personEyeColor">Eye Color</FieldLabel>
                  <Input
                    id="personEyeColor"
                    placeholder="e.g., Blue"
                    value={personEyeColor}
                    onChange={(e) => setPersonEyeColor(e.target.value)}
                  />
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="personClothing">Clothing Description</FieldLabel>
                <Textarea
                  id="personClothing"
                  placeholder="What were they last seen wearing?"
                  value={personClothing}
                  onChange={(e) => setPersonClothing(e.target.value)}
                  rows={2}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="personFeatures">Distinguishing Features</FieldLabel>
                <Input
                  id="personFeatures"
                  placeholder="e.g., Birthmark on left cheek, glasses"
                  value={personFeatures}
                  onChange={(e) => setPersonFeatures(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="personRelationship">Your Relationship</FieldLabel>
                <Input
                  id="personRelationship"
                  placeholder="e.g., Parent, Guardian, Family friend"
                  value={personRelationship}
                  onChange={(e) => setPersonRelationship(e.target.value)}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      {reportType === 'missing_item' && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Item Details</CardTitle>
            <CardDescription>Describe the missing item</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="itemType">Item Type *</FieldLabel>
                <Select value={itemType} onValueChange={(v) => setItemType(v as typeof itemType)}>
                  <SelectTrigger id="itemType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehicle">Vehicle</SelectItem>
                    <SelectItem value="device">Phone / Laptop / Device</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                    <SelectItem value="property">Other property</SelectItem>
                    <SelectItem value="pet">Pet</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {itemType === 'vehicle' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field>
                      <FieldLabel htmlFor="itemMake">Make</FieldLabel>
                      <Input
                        id="itemMake"
                        placeholder="e.g., Toyota"
                        value={itemMake}
                        onChange={(e) => setItemMake(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="itemModel">Model</FieldLabel>
                      <Input
                        id="itemModel"
                        placeholder="e.g., Camry"
                        value={itemModel}
                        onChange={(e) => setItemModel(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="itemYear">Year</FieldLabel>
                      <Input
                        id="itemYear"
                        type="number"
                        placeholder="e.g., 2020"
                        value={itemYear}
                        onChange={(e) => setItemYear(e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="itemColor">Color</FieldLabel>
                      <Input
                        id="itemColor"
                        placeholder="e.g., Silver"
                        value={itemColor}
                        onChange={(e) => setItemColor(e.target.value)}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="itemLicensePlate">License Plate</FieldLabel>
                      <Input
                        id="itemLicensePlate"
                        placeholder="e.g., ABC 1234"
                        value={itemLicensePlate}
                        onChange={(e) => setItemLicensePlate(e.target.value)}
                      />
                    </Field>
                  </div>
                </>
              ) : (
                <>
                  <Field>
                    <FieldLabel htmlFor="itemName">Item Name</FieldLabel>
                    <Input
                      id="itemName"
                      placeholder="e.g., iPhone 15 Pro, Golden Retriever named Max"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="itemColor">Color</FieldLabel>
                    <Input
                      id="itemColor"
                      placeholder="e.g., Black, Golden"
                      value={itemColor}
                      onChange={(e) => setItemColor(e.target.value)}
                    />
                  </Field>
                </>
              )}
              <Field>
                <FieldLabel htmlFor="itemDescription">Additional Description</FieldLabel>
                <Textarea
                  id="itemDescription"
                  placeholder="Any other identifying details..."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  rows={3}
                />
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Last Seen Location
          </CardTitle>
          <CardDescription>Last-seen area, or the area where you found the belonging. Your current location may be different.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <LocationPicker latitude={latitude} longitude={longitude} onPick={p=>{setLatitude(String(p.lat));setLongitude(String(p.lng));if(p.state)setStateArea(p.state);if(p.locality)setLocality(p.locality);if(p.name)setLastSeenLocation(p.locality || p.state || p.name.split(',')[0])}} />
            <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="stateArea">State / region *</FieldLabel><Input id="stateArea" required value={stateArea} onChange={e => setStateArea(e.target.value)} placeholder="e.g., Kaduna" maxLength={100} /></Field><Field><FieldLabel htmlFor="locality">Town / LGA *</FieldLabel><Input id="locality" required value={locality} onChange={e => setLocality(e.target.value)} placeholder="e.g., Chikun" maxLength={100} /></Field></div>
            <div className="space-y-3"><Button type="button" variant="outline" disabled={locating} onClick={locate}>{locating ? 'Locating…' : 'Use my location as the last-seen area'}</Button><p className="text-xs text-muted-foreground">Optional. Coordinates are rounded to a general area and will be public. Use only if you are at the last-seen location.</p><div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="latitude">Approximate latitude</FieldLabel><Input id="latitude" type="number" min="-90" max="90" step="any" value={latitude} onChange={e => setLatitude(e.target.value)} /></Field><Field><FieldLabel htmlFor="longitude">Approximate longitude</FieldLabel><Input id="longitude" type="number" min="-180" max="180" step="any" value={longitude} onChange={e => setLongitude(e.target.value)} /></Field></div></div>
            <Field>
              <FieldLabel htmlFor="lastSeenLocation">General area / landmark (public)</FieldLabel>
              <Input
                id="lastSeenLocation"
                placeholder="General last-seen area or landmark"
                value={lastSeenLocation}
                onChange={(e) => setLastSeenLocation(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="lastSeenAt">Date and Time</FieldLabel>
              <Input
                id="lastSeenAt"
                type="datetime-local"
                value={lastSeenAt}
                onChange={(e) => setLastSeenAt(e.target.value)}
              />
            </Field>
          </FieldGroup>
        </CardContent>
      </Card>

      {/* Photo Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Photos
          </CardTitle>
          <CardDescription>
            Add up to 5 photos (max 5MB each) to help identify the person or item
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Upload Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900">
                  {dragActive ? 'Drop photos here' : 'Drag and drop photos here'}
                </p>
                <p className="text-sm text-gray-500">or</p>
                <div className="flex justify-center">
                  <label className="cursor-pointer">
                    <span className="sr-only">Choose photos</span>
                    <input
                      ref={photoInput}
                      type="file"
                      className="sr-only"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      multiple
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                    <Button type="button" variant="outline" onClick={() => photoInput.current?.click()}>
                      Choose Photos
                    </Button>
                  </label>
                </div>
                <p className="text-xs text-gray-500">
                  PNG, JPG, GIF up to 5MB each (max 5 photos)
                </p>
              </div>
            </div>

            {/* Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    Selected Photos ({selectedFiles.length}/5)
                  </p>
                  <p className="text-xs text-gray-500">
                    Total size: {(selectedFiles.reduce((acc, file) => acc + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={preview}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white p-2">
                        <p className="text-xs truncate">
                          {selectedFiles[index].name}
                        </p>
                        <p className="text-xs opacity-75">
                          {(selectedFiles[index].size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>Private contact for the case owner and reviewers. Other users send sightings through Idanu.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="contactName">Contact Name</FieldLabel>
              <Input
                id="contactName"
                placeholder="Your name or preferred contact"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="contactPhone">Phone Number</FieldLabel>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="Your phone number"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="contactEmail">Email</FieldLabel>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="Your email address"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </Field>
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <p className="text-xs text-muted-foreground">New cases are reviewed before public publication. Keep proof of ownership and sensitive details out of descriptions and photos.</p><Button type="submit" disabled={loading}>
          {loading ? <Spinner className="mr-2" /> : null}
          {loading ? 'Creating Report...' : 'Create Report'}
        </Button>
      </div>
    </form>
  )
}
