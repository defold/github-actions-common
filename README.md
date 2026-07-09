# github-actions-common

Repository contains set of reusable Github workflows which can be used in different repositories as utility stuff.

## Available actions and workflows

- [`defoldsdk` reusable workflow](./.github/workflows/defoldsdk.yml)
- [`add-issue-to-project` reusable workflow](./.github/workflows/add-issue-to-project.yml)
- [`android` composite action](./.github/actions/android/README.md)

## Add new issues to a Project

Add this workflow to a repository that should send newly opened issues to a GitHub Project v2:

```yaml
name: Add new issues to project

on:
  issues:
    types: [opened]

jobs:
  add-issue-to-project:
    uses: defold/github-actions-common/.github/workflows/add-issue-to-project.yml@<ref>
    with:
      project_owner: defold
      project_number: 1
    secrets:
      PROJECT_TOKEN: ${{ secrets.PROJECT_TOKEN }}
```

`PROJECT_TOKEN` should be a PAT or GitHub App token with write access to the target Project and read access to the issue repository. If it is not provided, the reusable workflow falls back to `github.token`.
