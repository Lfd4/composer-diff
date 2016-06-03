# composer-diff
A tool to create commit messages for changes in a composer.lock file.

## Installing

Install from npm (as root):

    # npm install -g composer-diff
    
## Usage

Autofill the commit message:

    $ composer-diff | git commit -F-
    
or as a commit template:

    $ git commit -t- <(composer-diff)
