#!/bin/bash
clear
echo "==========================================="
echo "       VEYANIX GITHUB PUSH HELPER          "
echo "==========================================="
echo ""

# Ensure we are inside the Veyanix repository
cd "$(dirname "$0")"

# 1. Initialize git if not already done
if [ ! -d ".git" ]; then
  echo "Initializing local Git repository..."
  git init
  git branch -M main
fi

# Set default remote URL (HTTPS)
git remote remove origin 2>/dev/null
git remote add origin https://github.com/vmishra06-cdk/Veyanix.git

# 2. Stage and commit files
echo "Checking repository status..."
if [ -n "$(git status --porcelain)" ]; then
  echo "Changes detected. Staging and committing files..."
  git add .
  git commit -m "Initialize Veyanix Platform code"
else
  echo "Repository is clean. No new local changes to commit."
fi

echo ""
echo "How would you like to authenticate with GitHub?"
echo "1) Enter a Personal Access Token (PAT) [easiest, no installation needed]"
echo "2) Log in via Web Browser (using GitHub CLI)"
echo "3) Push using SSH keys (git@github.com:...)"
echo ""
read -p "Select option [1-3]: " AUTH_METHOD

if [ "$AUTH_METHOD" = "1" ]; then
  echo ""
  echo "To get a Personal Access Token:"
  echo "1. Go to: https://github.com/settings/tokens"
  echo "2. Click 'Generate new token (classic)'"
  echo "3. Give it a name and check the 'repo' scope checkbox"
  echo "4. Click 'Generate token' and copy it"
  echo ""
  read -sp "Paste your GitHub Personal Access Token (PAT): " PAT
  echo ""
  
  if [ -z "$PAT" ]; then
    echo "Error: Token was empty."
    exit 1
  fi
  
  echo "Uploading Veyanix files to GitHub..."
  # Push using authenticated URL structure
  git push "https://vmishra06-cdk:${PAT}@github.com/vmishra06-cdk/Veyanix.git" main
  
elif [ "$AUTH_METHOD" = "2" ]; then
  echo ""
  echo "Starting GitHub CLI authentication..."
  gh auth login
  echo "Uploading Veyanix files to GitHub..."
  git push -u origin main
  
elif [ "$AUTH_METHOD" = "3" ]; then
  echo ""
  echo "Configuring remote to use SSH..."
  git remote set-url origin git@github.com:vmishra06-cdk/Veyanix.git
  echo "Uploading Veyanix files to GitHub..."
  git push -u origin main
  
else
  echo "Invalid option selected. Exiting."
  exit 1
fi

echo ""
echo "==========================================="
echo "                 COMPLETE                  "
echo "==========================================="
