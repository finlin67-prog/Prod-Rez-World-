'use client'

import { useState, useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { motion, AnimatePresence } from 'framer-motion'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Briefcase, MapPin, Calendar, Award, ChevronRight, X } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

export default function CareerThemePark() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const popupRef = useRef(null)
  
  // Data state
  const [rolesData, setRolesData] = useState([])
  const [rolesFullData, setRolesFullData] = useState({})
  const [skillsData, setSkillsData] = useState([])
  const [geojsonData, setGeojsonData] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Computed indexes
  const [roleByAttractionId, setRoleByAttractionId] = useState({})
  const [fullRoleById, setFullRoleById] = useState({})
  const [skillsIndex, setSkillsIndex] = useState({})
  const [industries, setIndustries] = useState([])
  const [yearRange, setYearRange] = useState({ min: 2003, max: 2025 })
  
  // Filter state
  const [selectedSkills, setSelectedSkills] = useState([])
  const [selectedIndustries, setSelectedIndustries] = useState([])
  const [selectedSeniority, setSelectedSeniority] = useState('all')
  const [currentYear, setCurrentYear] = useState(2025)
  const [activeTab, setActiveTab] = useState('roles')
  
  // UI state
  const [selectedRole, setSelectedRole] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [modalRole, setModalRole] = useState(null)

  // Load all data files
  useEffect(() => {
    const loadData = async () => {
      try {
        const [rolesRes, rolesFullRes, skillsRes, geojsonRes] = await Promise.all([
          fetch('/data/roles.json'),
          fetch('/data/roles_full.json'),
          fetch('/data/skills.json'),
          fetch('/data/career-world.geojson')
        ])
        
        const roles = await rolesRes.json()
        const rolesFull = await rolesFullRes.json()
        const skills = await skillsRes.json()
        const geojson = await geojsonRes.json()
        
        setRolesData(roles)
        setRolesFullData(rolesFull)
        setSkillsData(skills.skills || [])
        setGeojsonData(geojson)
        
        // Build indexes
        const roleByAttraction = {}
        roles.forEach(role => {
          if (role.attractionId) {
            roleByAttraction[role.attractionId] = role
          }
        })
        setRoleByAttractionId(roleByAttraction)
        setFullRoleById(rolesFull)
        
        const skillsIdx = {}
        skills.skills.forEach(skill => {
          skillsIdx[skill.id] = skill
        })
        setSkillsIndex(skillsIdx)
        
        // Extract industries from geojson
        const industriesSet = new Set()
        geojson.features.forEach(feature => {
          if (feature.properties.kind === 'role' && feature.properties.industries) {
            feature.properties.industries.forEach(ind => industriesSet.add(ind))
          }
        })
        setIndustries(Array.from(industriesSet).sort())
        
        // Compute year range
        const years = roles.flatMap(r => [r.startYear, r.endYear]).filter(Boolean)
        const minYear = Math.min(...years)
        const maxYear = Math.max(...years)
        setYearRange({ min: minYear, max: maxYear })
        setCurrentYear(maxYear)
        
        setLoading(false)
      } catch (error) {
        console.error('Error loading data:', error)
        setLoading(false)
      }
    }
    
    loadData()
  }, [])

  // Initialize Mapbox
  useEffect(() => {
    if (!geojsonData || map.current) return
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [50, 50],
      zoom: 1.5,
      projection: 'mercator'
    })
    
    map.current.on('load', () => {
      // Add GeoJSON source
      map.current.addSource('career-data', {
        type: 'geojson',
        data: geojsonData
      })
      
      // Add zone polygons
      map.current.addLayer({
        id: 'zones',
        type: 'fill',
        source: 'career-data',
        filter: ['==', ['get', 'kind'], 'zone'],
        paint: {
          'fill-color': [
            'match',
            ['get', 'theme'],
            'growth', '#10b981',
            'martech', '#8b5cf6',
            'demand-gen', '#f59e0b',
            'revops', '#3b82f6',
            'abm', '#ec4899',
            'citadel', '#ef4444',
            '#6b7280'
          ],
          'fill-opacity': 0.2
        }
      })
      
      // Add zone borders
      map.current.addLayer({
        id: 'zones-border',
        type: 'line',
        source: 'career-data',
        filter: ['==', ['get', 'kind'], 'zone'],
        paint: {
          'line-color': [
            'match',
            ['get', 'theme'],
            'growth', '#10b981',
            'martech', '#8b5cf6',
            'demand-gen', '#f59e0b',
            'revops', '#3b82f6',
            'abm', '#ec4899',
            'citadel', '#ef4444',
            '#6b7280'
          ],
          'line-width': 2,
          'line-opacity': 0.6
        }
      })
      
      // Add zone labels
      map.current.addLayer({
        id: 'zones-labels',
        type: 'symbol',
        source: 'career-data',
        filter: ['==', ['get', 'kind'], 'zone'],
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-size': 14,
          'text-transform': 'uppercase'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2
        }
      })
      
      // Add attractions-dim layer (all filtered roles)
      map.current.addLayer({
        id: 'attractions-dim',
        type: 'circle',
        source: 'career-data',
        filter: ['all',
          ['==', ['get', 'kind'], 'role'],
          ['in', ['id'], ['literal', []]]
        ],
        paint: {
          'circle-radius': 8,
          'circle-color': '#60a5fa',
          'circle-opacity': 0.5,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#3b82f6',
          'circle-stroke-opacity': 0.5
        }
      })
      
      // Add attractions-highlight layer (current year roles)
      map.current.addLayer({
        id: 'attractions-highlight',
        type: 'circle',
        source: 'career-data',
        filter: ['all',
          ['==', ['get', 'kind'], 'role'],
          ['in', ['id'], ['literal', []]]
        ],
        paint: {
          'circle-radius': 12,
          'circle-color': '#fbbf24',
          'circle-opacity': 0.8,
          'circle-stroke-width': 3,
          'circle-stroke-color': '#f59e0b',
          'circle-stroke-opacity': 1
        }
      })
      
      // Add attraction labels
      map.current.addLayer({
        id: 'attractions-labels',
        type: 'symbol',
        source: 'career-data',
        filter: ['all',
          ['==', ['get', 'kind'], 'role'],
          ['in', ['id'], ['literal', []]]
        ],
        layout: {
          'text-field': ['get', 'company'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, 1.5],
          'text-anchor': 'top'
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 1.5
        }
      })
      
      // Click handler
      map.current.on('click', 'attractions-dim', handleAttractionClick)
      map.current.on('click', 'attractions-highlight', handleAttractionClick)
      
      // Hover effects
      map.current.on('mouseenter', 'attractions-dim', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'attractions-dim', () => {
        map.current.getCanvas().style.cursor = ''
      })
      map.current.on('mouseenter', 'attractions-highlight', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'attractions-highlight', () => {
        map.current.getCanvas().style.cursor = ''
      })
    })
    
    return () => {
      if (map.current) {
        map.current.remove()
        map.current = null
      }
    }
  }, [geojsonData])

  // Update filters whenever selections change
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded() || !rolesData.length || !geojsonData) return
    
    const allowedAttractionIds = []
    const highlightAttractionIds = []
    
    // Build a map of feature ID to role for quick lookup
    const featureToRole = new Map()
    geojsonData.features.forEach(feature => {
      if (feature.properties.kind === 'role') {
        // Find matching role
        const role = rolesData.find(r => 
          r.attractionId === feature.id || 
          r.id === feature.id ||
          feature.properties.title === r.title
        )
        if (role) {
          featureToRole.set(feature.id, role)
        }
      }
    })
    
    featureToRole.forEach((role, featureId) => {
      // Apply filters
      let passes = true
      
      // Skills filter
      if (selectedSkills.length > 0) {
        const hasSkill = selectedSkills.some(skillId => role.skills?.includes(skillId))
        if (!hasSkill) passes = false
      }
      
      // Seniority filter
      if (selectedSeniority !== 'all' && role.seniority !== selectedSeniority) {
        passes = false
      }
      
      // Year filter (show roles that were active during or before currentYear)
      if (role.endYear && role.endYear > currentYear) {
        passes = false
      }
      
      // Industries filter - check against geojson data
      if (selectedIndustries.length > 0) {
        const feature = geojsonData.features.find(f => f.id === featureId)
        if (feature) {
          const roleIndustries = feature.properties.industries || []
          const hasIndustry = selectedIndustries.some(ind => roleIndustries.includes(ind))
          if (!hasIndustry) passes = false
        }
      }
      
      if (passes) {
        allowedAttractionIds.push(featureId)
        
        // Highlight if endYear matches currentYear
        if (role.endYear === currentYear || (!role.endYear && role.startYear === currentYear)) {
          highlightAttractionIds.push(featureId)
        }
      }
    })
    
    // Update map filters
    map.current.setFilter('attractions-dim', [
      'all',
      ['==', ['get', 'kind'], 'role'],
      ['in', ['id'], ['literal', allowedAttractionIds]],
      ['!', ['in', ['id'], ['literal', highlightAttractionIds]]]
    ])
    
    map.current.setFilter('attractions-highlight', [
      'all',
      ['==', ['get', 'kind'], 'role'],
      ['in', ['id'], ['literal', highlightAttractionIds]]
    ])
    
    map.current.setFilter('attractions-labels', [
      'all',
      ['==', ['get', 'kind'], 'role'],
      ['in', ['id'], ['literal', allowedAttractionIds]]
    ])
  }, [selectedSkills, selectedIndustries, selectedSeniority, currentYear, rolesData, geojsonData])

  const handleAttractionClick = (e) => {
    const feature = e.features[0]
    const featureId = feature.id
    
    // Find role by matching either attractionId or id
    const role = rolesData.find(r => 
      r.attractionId === featureId || 
      r.id === featureId ||
      feature.properties.title === r.title
    )
    if (!role) {
      console.log('No role found for feature:', featureId, feature.properties)
      return
    }
    
    setSelectedRole(role)
    
    // Fly to location
    const coordinates = feature.geometry.coordinates.slice()
    map.current.flyTo({
      center: coordinates,
      zoom: 3,
      duration: 1500
    })
    
    // Create popup
    if (popupRef.current) {
      popupRef.current.remove()
    }
    
    const skillTags = (role.skills || []).slice(0, 3).map(skillId => {
      const skill = skillsIndex[skillId]
      return skill ? skill.label : skillId
    }).join(', ')
    
    popupRef.current = new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: false,
      offset: 25
    })
      .setLngLat(coordinates)
      .setHTML(`
        <div style="min-width: 250px; max-width: 320px; padding: 8px;">
          <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 4px; color: #1f2937;">${role.title}</h3>
          <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">${role.company}</p>
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 8px;">${role.startYear}–${role.endYear || 'Present'}</p>
          ${skillTags ? `<p style="font-size: 11px; color: #3b82f6; margin-top: 8px;">${skillTags}</p>` : ''}
        </div>
      `)
      .addTo(map.current)
  }

  const toggleSkill = (skillId) => {
    setSelectedSkills(prev => 
      prev.includes(skillId) 
        ? prev.filter(s => s !== skillId)
        : [...prev, skillId]
    )
  }

  const toggleIndustry = (industry) => {
    setSelectedIndustries(prev => 
      prev.includes(industry)
        ? prev.filter(i => i !== industry)
        : [...prev, industry]
    )
  }

  const clearAllFilters = () => {
    setSelectedSkills([])
    setSelectedIndustries([])
    setSelectedSeniority('all')
    setCurrentYear(yearRange.max)
  }

  const openFullExperience = (role) => {
    setModalRole(role)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Career Theme Park...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950">
      {/* Top Navigation Bar */}
      <div className="bg-gradient-to-r from-purple-900 via-pink-900 to-red-900 border-b border-pink-500/30 shadow-lg">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Briefcase className="w-8 h-8 text-yellow-400" />
              <h1 className="text-2xl font-bold text-white">Career Theme Park</h1>
            </div>
            <div className="flex space-x-2">
              {['roles', 'skills', 'projects', 'certifications'].map(tab => (
                <Button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  variant={activeTab === tab ? 'default' : 'ghost'}
                  className={activeTab === tab ? 'bg-yellow-500 text-black hover:bg-yellow-400' : 'text-white hover:bg-white/20'}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Filters */}
        <motion.div 
          initial={{ x: -300 }}
          animate={{ x: 0 }}
          className="w-80 bg-slate-900 border-r border-slate-700 overflow-y-auto"
        >
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Filters</h2>
              <Button onClick={clearAllFilters} variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-white">
                Clear All
              </Button>
            </div>

            {/* Skills Filter */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {skillsData.map(skill => (
                  <Badge
                    key={skill.id}
                    variant={selectedSkills.includes(skill.id) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      selectedSkills.includes(skill.id)
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'text-slate-400 border-slate-600 hover:border-blue-400 hover:text-blue-400'
                    }`}
                    onClick={() => toggleSkill(skill.id)}
                  >
                    {skill.label}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Industries Filter */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Industries</h3>
              <div className="flex flex-wrap gap-2">
                {industries.map(industry => (
                  <Badge
                    key={industry}
                    variant={selectedIndustries.includes(industry) ? 'default' : 'outline'}
                    className={`cursor-pointer transition-all ${
                      selectedIndustries.includes(industry)
                        ? 'bg-purple-500 text-white hover:bg-purple-600'
                        : 'text-slate-400 border-slate-600 hover:border-purple-400 hover:text-purple-400'
                    }`}
                    onClick={() => toggleIndustry(industry)}
                  >
                    {industry}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator className="bg-slate-700" />

            {/* Seniority Filter */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Seniority</h3>
              <Select value={selectedSeniority} onValueChange={setSelectedSeniority}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select seniority" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator className="bg-slate-700" />

            {/* Year Slider */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-300">Career Timeline</h3>
                <span className="text-lg font-bold text-yellow-400">{currentYear}</span>
              </div>
              <Slider
                value={[currentYear]}
                onValueChange={(value) => setCurrentYear(value[0])}
                min={yearRange.min}
                max={yearRange.max}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{yearRange.min}</span>
                <span>{yearRange.max}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Map Container */}
        <div className="flex-1 relative">
          <div ref={mapContainer} className="w-full h-full" />
        </div>

        {/* Right Sidebar - Details */}
        <AnimatePresence>
          {selectedRole && (
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="w-96 bg-slate-900 border-l border-slate-700 overflow-y-auto"
            >
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between">
                  <h2 className="text-xl font-bold text-white">Role Details</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setSelectedRole(null)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">{selectedRole.title}</CardTitle>
                    <CardDescription className="text-slate-300">{selectedRole.company}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center text-slate-400 text-sm">
                      <Calendar className="w-4 h-4 mr-2" />
                      {selectedRole.startYear}–{selectedRole.endYear || 'Present'}
                    </div>
                    
                    {selectedRole.location && (
                      <div className="flex items-center text-slate-400 text-sm">
                        <MapPin className="w-4 h-4 mr-2" />
                        {selectedRole.location}
                      </div>
                    )}

                    <Separator className="bg-slate-700" />

                    <div>
                      <h4 className="text-sm font-semibold text-white mb-2">Summary</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{selectedRole.summary}</p>
                    </div>

                    {selectedRole.highlights && selectedRole.highlights.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Highlights</h4>
                        <ul className="space-y-2">
                          {selectedRole.highlights.slice(0, 3).map((highlight, idx) => (
                            <li key={idx} className="text-sm text-slate-300 flex items-start">
                              <Award className="w-3 h-3 mr-2 mt-1 flex-shrink-0 text-yellow-400" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedRole.skills && selectedRole.skills.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Skills</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedRole.skills.map(skillId => {
                            const skill = skillsIndex[skillId]
                            return (
                              <Badge key={skillId} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                {skill ? skill.label : skillId}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {selectedRole.tools && selectedRole.tools.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold text-white mb-2">Tools</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedRole.tools.map(tool => (
                            <Badge key={tool} variant="outline" className="text-slate-400 border-slate-600">
                              {tool}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {fullRoleById[selectedRole.id] && (
                      <Button 
                        onClick={() => openFullExperience(selectedRole)}
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                      >
                        View Full Experience
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Full Experience Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-3xl max-h-[80vh] bg-slate-900 text-white border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-2xl">{modalRole?.title}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {modalRole?.company} | {modalRole?.startYear}–{modalRole?.endYear || 'Present'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {modalRole && fullRoleById[modalRole.id] && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-400">Overview</h3>
                  <p className="text-slate-300 leading-relaxed">
                    {fullRoleById[modalRole.id].longSummary}
                  </p>
                </div>

                {fullRoleById[modalRole.id].responsibilities && fullRoleById[modalRole.id].responsibilities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-400">Responsibilities</h3>
                    <ul className="space-y-2">
                      {fullRoleById[modalRole.id].responsibilities.map((resp, idx) => (
                        <li key={idx} className="text-slate-300 flex items-start">
                          <span className="text-purple-400 mr-2">•</span>
                          <span>{resp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {fullRoleById[modalRole.id].bullets && fullRoleById[modalRole.id].bullets.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3 text-purple-400">Key Achievements</h3>
                    <ul className="space-y-2">
                      {fullRoleById[modalRole.id].bullets.map((bullet, idx) => (
                        <li key={idx} className="text-slate-300 flex items-start">
                          <Award className="w-4 h-4 mr-2 mt-1 flex-shrink-0 text-yellow-400" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
