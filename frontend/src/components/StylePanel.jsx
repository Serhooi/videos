import { useState } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Label } from '@/components/ui/label.jsx'
import { Slider } from '@/components/ui/slider.jsx'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.jsx'
import { Badge } from '@/components/ui/badge.jsx'
import { 
  Type, 
  Palette, 
  Move, 
  Sparkles,
  Eye,
  Download,
  RotateCcw
} from 'lucide-react'

const StylePanel = ({ styles, setStyles }) => {
  const [activePreset, setActivePreset] = useState(null)

  // Предустановленные стили
  const presets = {
    modern: {
      name: 'Modern',
      fontFamily: 'Inter',
      fontSize: 32,
      fontWeight: 'normal',
      italic: false,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      outline: 2,
      shadow: 0,
      alignment: 2,
      marginV: 60
    },
    neon: {
      name: 'Neon',
      fontFamily: 'Arial',
      fontSize: 36,
      fontWeight: 'bold',
      italic: false,
      primaryColor: '#00FF00',
      outlineColor: '#FF00FF',
      outline: 3,
      shadow: 2,
      alignment: 2,
      marginV: 60
    },
    classic: {
      name: 'Classic',
      fontFamily: 'Times New Roman',
      fontSize: 28,
      fontWeight: 'normal',
      italic: false,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      outline: 1,
      shadow: 1,
      alignment: 2,
      marginV: 40
    },
    minimal: {
      name: 'Minimal',
      fontFamily: 'Helvetica',
      fontSize: 24,
      fontWeight: 'normal',
      italic: false,
      primaryColor: '#FFFFFF',
      outlineColor: 'transparent',
      outline: 0,
      shadow: 0,
      alignment: 2,
      marginV: 80
    },
    bold: {
      name: 'Bold',
      fontFamily: 'Arial Black',
      fontSize: 40,
      fontWeight: 'bold',
      italic: false,
      primaryColor: '#FFFF00',
      outlineColor: '#000000',
      outline: 4,
      shadow: 3,
      alignment: 2,
      marginV: 50
    }
  }

  // Обновление стиля
  const updateStyle = (key, value) => {
    setStyles(prev => ({
      ...prev,
      [key]: value
    }))
    setActivePreset(null) // Сброс активного пресета при ручном изменении
  }

  // Применение пресета
  const applyPreset = (presetKey) => {
    const preset = presets[presetKey]
    setStyles(prev => ({
      ...prev,
      ...preset
    }))
    setActivePreset(presetKey)
  }

  // Сброс к умолчанию
  const resetToDefault = () => {
    applyPreset('modern')
  }

  // Конвертация цвета в hex
  const colorToHex = (color) => {
    if (color.startsWith('#')) return color
    return '#FFFFFF'
  }

  // Позиции субтитров (ASS alignment)
  const alignmentOptions = [
    { value: 1, label: 'Bottom Left', position: 'bottom-left' },
    { value: 2, label: 'Bottom Center', position: 'bottom-center' },
    { value: 3, label: 'Bottom Right', position: 'bottom-right' },
    { value: 4, label: 'Middle Left', position: 'middle-left' },
    { value: 5, label: 'Middle Center', position: 'middle-center' },
    { value: 6, label: 'Middle Right', position: 'middle-right' },
    { value: 7, label: 'Top Left', position: 'top-left' },
    { value: 8, label: 'Top Center', position: 'top-center' },
    { value: 9, label: 'Top Right', position: 'top-right' }
  ]

  return (
    <div className="h-full overflow-auto">
      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mx-4 mt-4">
          <TabsTrigger value="presets" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            Presets
          </TabsTrigger>
          <TabsTrigger value="typography" className="text-xs">
            <Type className="h-3 w-3 mr-1" />
            Text
          </TabsTrigger>
          <TabsTrigger value="colors" className="text-xs">
            <Palette className="h-3 w-3 mr-1" />
            Colors
          </TabsTrigger>
          <TabsTrigger value="position" className="text-xs">
            <Move className="h-3 w-3 mr-1" />
            Position
          </TabsTrigger>
        </TabsList>

        {/* Presets Tab */}
        <TabsContent value="presets" className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {Object.entries(presets).map(([key, preset]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  activePreset === key ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => applyPreset(key)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{preset.name}</h4>
                    {activePreset === key && (
                      <Badge variant="default" className="text-xs">Active</Badge>
                    )}
                  </div>
                  
                  {/* Preview */}
                  <div 
                    className="text-center py-2 px-3 rounded bg-black text-white text-sm"
                    style={{
                      fontFamily: preset.fontFamily,
                      fontSize: `${Math.max(12, preset.fontSize * 0.4)}px`,
                      fontWeight: preset.fontWeight,
                      fontStyle: preset.italic ? 'italic' : 'normal',
                      color: preset.primaryColor,
                      textShadow: preset.outline > 0 ? `1px 1px 2px ${preset.outlineColor}` : 'none'
                    }}
                  >
                    Sample Text
                  </div>
                  
                  <div className="text-xs text-muted-foreground mt-2">
                    {preset.fontFamily} • {preset.fontSize}px
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Button 
            variant="outline" 
            onClick={resetToDefault}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset to Default
          </Button>
        </TabsContent>

        {/* Typography Tab */}
        <TabsContent value="typography" className="p-4 space-y-4">
          {/* Font Family */}
          <div>
            <Label htmlFor="fontFamily">Font Family</Label>
            <Select 
              value={styles.fontFamily} 
              onValueChange={(value) => updateStyle('fontFamily', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Arial">Arial</SelectItem>
                <SelectItem value="Helvetica">Helvetica</SelectItem>
                <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                <SelectItem value="Georgia">Georgia</SelectItem>
                <SelectItem value="Verdana">Verdana</SelectItem>
                <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                <SelectItem value="Impact">Impact</SelectItem>
                <SelectItem value="Arial Black">Arial Black</SelectItem>
                <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
                <SelectItem value="Courier New">Courier New</SelectItem>
                <SelectItem value="Inter">Inter</SelectItem>
                <SelectItem value="Roboto">Roboto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Font Size */}
          <div>
            <Label htmlFor="fontSize">Font Size: {styles.fontSize}px</Label>
            <Slider
              value={[styles.fontSize]}
              min={12}
              max={72}
              step={2}
              onValueChange={(value) => updateStyle('fontSize', value[0])}
              className="mt-2"
            />
          </div>

          {/* Font Weight */}
          <div>
            <Label htmlFor="fontWeight">Font Weight</Label>
            <Select 
              value={styles.fontWeight} 
              onValueChange={(value) => updateStyle('fontWeight', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="bold">Bold</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Italic */}
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="italic"
              checked={styles.italic}
              onChange={(e) => updateStyle('italic', e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="italic">Italic</Label>
          </div>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div 
                className="text-center py-4 px-3 rounded bg-black text-white"
                style={{
                  fontFamily: styles.fontFamily,
                  fontSize: `${Math.max(16, styles.fontSize * 0.6)}px`,
                  fontWeight: styles.fontWeight,
                  fontStyle: styles.italic ? 'italic' : 'normal',
                  color: styles.primaryColor,
                  textShadow: styles.outline > 0 ? `2px 2px 4px ${styles.outlineColor}` : 'none'
                }}
              >
                Sample Subtitle Text
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Colors Tab */}
        <TabsContent value="colors" className="p-4 space-y-4">
          {/* Primary Color */}
          <div>
            <Label htmlFor="primaryColor">Text Color</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                type="color"
                value={colorToHex(styles.primaryColor)}
                onChange={(e) => updateStyle('primaryColor', e.target.value)}
                className="w-12 h-10 p-1 rounded"
              />
              <Input
                type="text"
                value={styles.primaryColor}
                onChange={(e) => updateStyle('primaryColor', e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1"
              />
            </div>
          </div>

          {/* Outline Color */}
          <div>
            <Label htmlFor="outlineColor">Outline Color</Label>
            <div className="flex items-center space-x-2 mt-2">
              <Input
                type="color"
                value={colorToHex(styles.outlineColor)}
                onChange={(e) => updateStyle('outlineColor', e.target.value)}
                className="w-12 h-10 p-1 rounded"
              />
              <Input
                type="text"
                value={styles.outlineColor}
                onChange={(e) => updateStyle('outlineColor', e.target.value)}
                placeholder="#000000"
                className="flex-1"
              />
            </div>
          </div>

          {/* Outline Width */}
          <div>
            <Label htmlFor="outline">Outline Width: {styles.outline}px</Label>
            <Slider
              value={[styles.outline]}
              min={0}
              max={8}
              step={1}
              onValueChange={(value) => updateStyle('outline', value[0])}
              className="mt-2"
            />
          </div>

          {/* Shadow */}
          <div>
            <Label htmlFor="shadow">Shadow: {styles.shadow}px</Label>
            <Slider
              value={[styles.shadow]}
              min={0}
              max={8}
              step={1}
              onValueChange={(value) => updateStyle('shadow', value[0])}
              className="mt-2"
            />
          </div>

          {/* Color Presets */}
          <div>
            <Label>Quick Colors</Label>
            <div className="grid grid-cols-6 gap-2 mt-2">
              {[
                '#FFFFFF', '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
                '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB', '#A52A2A'
              ].map(color => (
                <button
                  key={color}
                  className="w-8 h-8 rounded border-2 border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => updateStyle('primaryColor', color)}
                />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Position Tab */}
        <TabsContent value="position" className="p-4 space-y-4">
          {/* Alignment */}
          <div>
            <Label htmlFor="alignment">Position</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {alignmentOptions.map(option => (
                <Button
                  key={option.value}
                  variant={styles.alignment === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateStyle('alignment', option.value)}
                  className="text-xs p-2 h-auto"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Vertical Margin */}
          <div>
            <Label htmlFor="marginV">Bottom Margin: {styles.marginV}px</Label>
            <Slider
              value={[styles.marginV]}
              min={0}
              max={200}
              step={10}
              onValueChange={(value) => updateStyle('marginV', value[0])}
              className="mt-2"
            />
          </div>

          {/* Left Margin */}
          <div>
            <Label htmlFor="marginL">Left Margin: {styles.marginL || 0}px</Label>
            <Slider
              value={[styles.marginL || 0]}
              min={0}
              max={200}
              step={10}
              onValueChange={(value) => updateStyle('marginL', value[0])}
              className="mt-2"
            />
          </div>

          {/* Right Margin */}
          <div>
            <Label htmlFor="marginR">Right Margin: {styles.marginR || 0}px</Label>
            <Slider
              value={[styles.marginR || 0]}
              min={0}
              max={200}
              step={10}
              onValueChange={(value) => updateStyle('marginR', value[0])}
              className="mt-2"
            />
          </div>

          {/* Position Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Position Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-32 bg-black rounded border">
                <div 
                  className="absolute text-white text-xs px-2 py-1 bg-black/70 rounded"
                  style={{
                    left: styles.alignment % 3 === 1 ? `${styles.marginL || 0}px` : 
                          styles.alignment % 3 === 0 ? 'auto' : '50%',
                    right: styles.alignment % 3 === 0 ? `${styles.marginR || 0}px` : 'auto',
                    top: Math.floor((styles.alignment - 1) / 3) === 0 ? 'auto' :
                         Math.floor((styles.alignment - 1) / 3) === 1 ? '50%' : `${styles.marginV}px`,
                    bottom: Math.floor((styles.alignment - 1) / 3) === 0 ? `${styles.marginV}px` : 'auto',
                    transform: styles.alignment % 3 === 2 ? 'translateX(-50%)' : 
                              Math.floor((styles.alignment - 1) / 3) === 1 ? 'translateY(-50%)' : 'none'
                  }}
                >
                  Subtitle
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Export Styles */}
      <div className="p-4 border-t border-border">
        <Button variant="outline" className="w-full" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Style
        </Button>
      </div>
    </div>
  )
}

export default StylePanel

