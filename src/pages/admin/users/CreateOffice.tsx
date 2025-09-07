const handleSubmit = async (values: any) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot create user.");
      return;
    }

    try {
      const newOfficeData = {
        full_name: values.full_name,
        phone: values.phone,
        role: 'office' as const,
        email: values.email,
        password: values.password,
      };

      const promise = createUser(currentOrgId, newOfficeData, currentProfile.id);
      toast.promise(promise, {
        loading: 'Creating office user...',
        success: 'Office user created successfully!',
        error: (err) => `Failed to create office user: ${err.message}`,
      });
      await promise;
      navigate('/admin/users');
    } catch (err: any) {
      console.error("Error creating office user:", err);
      toast.error("An unexpected error occurred while creating the office user.");
    }
  };