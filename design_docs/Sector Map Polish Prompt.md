# **Role & Context**

Act as a Senior React Frontend Engineer specializing in data visualization with D3.js and modern CSS animations.  
We are building a cooperative, digital tabletop space combat game called *Chain of Command*. I have a working React component that uses D3.js to render a *Slay the Spire*\-style branching campaign map (the "Sector Map").

## **The Problem**

The underlying data structure and pathing logic work perfectly, but visually, it currently looks like a boring corporate flowchart.

## **The Goal**

I need you to overhaul the visual presentation of this component. We need to transform it into a "Hegemony Tactical Radar Display"—a sleek, dark, sci-fi interface with glowing holograms, flowing data lines, and clear interactive feedback.

## **Step-by-Step Implementation Guide**

Please review my current React/D3 component (I will provide it after you acknowledge this prompt) and implement the following aesthetic and interactive upgrades:

### **Step 1: The Tactical Atmosphere (Background & Board)**

Wrap the SVG or the parent container in a deep, dark sci-fi background.

* Add a subtle, dark, semi-transparent CSS grid overlay to give it a "tactical display" feel.  
* Ensure the background uses deep space colors (e.g., very dark navy/obsidian) rather than flat black.

### **Step 2: Node Iconography & Styling**

We need to replace the plain text labels with sleek, recognizable icons and status indicators.

* **Icons:** Please integrate a lightweight icon set (like lucide-react or standard SVG paths) to replace the text.  
  * *\[Combat\]:* A sharp crosshair or target.  
  * *\[Elite\]:* A larger, more aggressive target with a warning frame.  
  * *\[Event\]:* A radar pulse or question mark.  
  * *\[Haven\]:* A wrench, shield, or space station.  
  * *\[Boss\]:* A massive skull or Hegemony crest.  
* **The Hologram Glow:** Apply SVG filters (feDropShadow or feGaussianBlur) to the nodes so they look like glowing holographic buttons.  
* **Status Colors:** Implement visual distinction based on the node's state:  
  * *Current Position:* Pulsing (using CSS keyframes) and brightly colored (e.g., cyan/blue).  
  * *Available/Selectable:* Bright and clearly clickable.  
  * *Locked/Future:* Dimmed out.  
  * *Completed/Missed:* Dark gray or barely visible.

### **Step 3: Dynamic Pathing (The Lines)**

The links between nodes shouldn't just be static lines; they should look like hyperspace routes or flowing data.

* **Energy Flow:** Style the SVG \<path\> elements connecting the nodes. Use stroke-dasharray and CSS animations to make the lines look like energy is flowing upward toward the boss.  
* **Path Highlighting:** When a user hovers over a selectable node, programmatically highlight the specific \<path\> lines that connect their *current* node to that hovered node. Dim the other irrelevant paths.

### **Step 4: Interactive Polish (Juice)**

* **Hover States:** When hovering over any node, use D3 transitions or CSS transform to smoothly scale the node up slightly (e.g., scale(1.1)).  
* **Tooltips:** Since we removed the text from the nodes, implement a sleek, dark-themed tooltip that appears on hover, displaying the Node Type (e.g., "Hostile Patrol") and any relevant RP/FF costs if it's an Event or Haven.

## **Instructions for You**

If you understand these requirements, please reply with **"Radar Online. Please provide the current Sector Map component code."** Once I paste the code, please refactor it to include these D3 and CSS upgrades, ensuring you don't break the existing tree-generation or pathing logic.