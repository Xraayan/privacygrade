// Build script for PrivacyGrade extension
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class ExtensionBuilder {
  constructor() {
    this.sourceDir = __dirname;
    this.buildDir = path.join(__dirname, 'build');
    this.excludeFiles = [
      'build.js',
      'README.md',
      '.git',
      '.gitignore',
      'node_modules',
      'build'
    ];
  }

  build() {
    console.log('Building PrivacyGrade extension...');
    
    // Create build directory
    this.createBuildDir();
    
    // Copy files
    this.copyFiles();
    
    // Validate manifest
    this.validateManifest();
    
    // Create ZIP package
    this.createPackage();
    
    console.log('Build complete!');
    console.log(`Package created: ${path.join(this.buildDir, 'privacygrade.zip')}`);
  }

  createBuildDir() {
    if (fs.existsSync(this.buildDir)) {
      fs.rmSync(this.buildDir, { recursive: true });
    }
    fs.mkdirSync(this.buildDir, { recursive: true });
  }

  copyFiles() {
    const copyRecursive = (src, dest) => {
      const stat = fs.statSync(src);
      
      if (stat.isDirectory()) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        
        const files = fs.readdirSync(src);
        files.forEach(file => {
          if (!this.excludeFiles.includes(file)) {
            copyRecursive(path.join(src, file), path.join(dest, file));
          }
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };

    const files = fs.readdirSync(this.sourceDir);
    files.forEach(file => {
      if (!this.excludeFiles.includes(file)) {
        const srcPath = path.join(this.sourceDir, file);
        const destPath = path.join(this.buildDir, file);
        copyRecursive(srcPath, destPath);
      }
    });
  }

  validateManifest() {
    const manifestPath = path.join(this.buildDir, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Basic validation
    const required = ['name', 'version', 'manifest_version', 'permissions'];
    for (const field of required) {
      if (!manifest[field]) {
        throw new Error(`Missing required field in manifest: ${field}`);
      }
    }
    
    console.log(`Manifest validated: ${manifest.name} v${manifest.version}`);
  }

  createPackage() {
    const zipPath = path.join(this.buildDir, 'privacygrade.zip');
    
    try {
      // Use system zip command if available
      execSync(`cd "${this.buildDir}" && zip -r privacygrade.zip . -x "privacygrade.zip"`);
    } catch (error) {
      console.log('System zip not available, creating manual archive...');
      // Fallback: could implement manual ZIP creation here
      console.log('Please manually zip the contents of the build directory');
    }
  }
}

// Run build if called directly
if (require.main === module) {
  const builder = new ExtensionBuilder();
  builder.build();
}

module.exports = ExtensionBuilder;