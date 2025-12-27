interface TemplateItem {
  filename?: string;
  fileExtension?: string;
  content?: string;
  folderName?: string;
  items?: TemplateItem[];
}

interface WebContainerFile {
  file: {
    contents: string;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;

export function transformToWebContainerFormat(template: { folderName: string; items: TemplateItem[] }): WebContainerFileSystem {
  console.log("Starting transformation with template:", template);
  
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    // Check if it's a folder
    if (item.folderName && item.items) {
      console.log("Processing folder:", item.folderName);
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach(subItem => {
        const key = subItem.fileExtension 
          ? `${subItem.filename}.${subItem.fileExtension}`
          : subItem.folderName!;
        
        console.log("Adding to directory:", key);
        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    } else if (item.filename !== undefined && item.content !== undefined) {
      // It's a file
      const fileName = item.fileExtension 
        ? `${item.filename}.${item.fileExtension}` 
        : item.filename;
      
      console.log("Processing file:", fileName);
      
      return {
        file: {
          contents: item.content || ""
        }
      };
    } else {
      console.warn("Unknown item type:", item);
      return {
        file: {
          contents: ""
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  // Process all items in the template
  if (template.items && Array.isArray(template.items)) {
    template.items.forEach(item => {
      const key = item.fileExtension 
        ? `${item.filename}.${item.fileExtension}`
        : item.folderName!;
      
      console.log("Adding root item:", key);
      result[key] = processItem(item);
    });
  }

  console.log("Transformation complete. Result:", result);
  return result;
}



/*


3. Transformer Function 

previous code(Broken)

export function transformToWebContainerFormat(template: { folderName: string; items: TemplateItem[] }): WebContainerFileSystem {
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    if (item.folderName && item.items) {
      // Folder processing
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach(subItem => {
        const key = subItem.fileExtension 
          ? `${subItem.filename}.${subItem.fileExtension}`
          : subItem.folderName!;
        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    } else {
      // File processing - MISSING PROPER CHECKS
      return {
        file: {
          contents: item.content
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  template.items.forEach(item => {
    const key = item.fileExtension 
      ? `${item.filename}.${item.fileExtension}`
      : item.folderName!;
    result[key] = processItem(item);
  });

  return result;
}1 // Note the typo "1" at the end


our fixed code 

export function transformToWebContainerFormat(template: { folderName: string; items: TemplateItem[] }): WebContainerFileSystem {
  console.log("Starting transformation with template:", template);
  
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    // Check if it's a folder
    if (item.folderName && item.items) {
      console.log("Processing folder:", item.folderName);
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach(subItem => {
        const key = subItem.fileExtension 
          ? `${subItem.filename}.${subItem.fileExtension}`
          : subItem.folderName!;
        
        console.log("Adding to directory:", key);
        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    } else if (item.filename !== undefined && item.content !== undefined) {
      // EXPLICIT CHECK for files
      const fileName = item.fileExtension 
        ? `${item.filename}.${item.fileExtension}` 
        : item.filename;
      
      console.log("Processing file:", fileName);
      
      return {
        file: {
          contents: item.content || "" // Fallback to empty string
        }
      };
    } else {
      // Handle unknown items gracefully
      console.warn("Unknown item type:", item);
      return {
        file: {
          contents: ""
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  // ADDED validation check
  if (template.items && Array.isArray(template.items)) {
    template.items.forEach(item => {
      const key = item.fileExtension 
        ? `${item.filename}.${item.fileExtension}`
        : item.folderName!;
      
      console.log("Adding root item:", key);
      result[key] = processItem(item);
    });
  }

  console.log("Transformation complete. Result:", result);
  return result;
}

















*/