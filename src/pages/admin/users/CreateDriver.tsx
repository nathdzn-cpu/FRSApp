const handleSubmit = async (values: any) => {
    if (!currentProfile) {
      toast.error("Admin profile not found. Cannot create user.");
      return;
    }

    try {
      const newDriverData: any = {
        full_name: values.full_name,
        dob: values.dob ? values.dob.toISOString().split('T')[0] : undefined,
        phone: values.phone,
        role: 'driver' as const,
        email: values.email,
        password: values.password,
      };

      if (values.truck_reg) {
        newDriverData.truck_reg = values.truck_reg;
      }
      if (values.trailer_no) {
        newDriverData.trailer_no = values.trailer_no;
      }

      const promise = createUser(currentOrgId, newDriverData, currentProfile.id);
      toast.promise(promise, {
        loading: 'Creating driver...',
        success: 'Driver created successfully!',
        error: (err) => `Failed to create driver: ${err.message}`,
      });
      await promise;
      navigate('/admin/users');
    } catch (err: any) {
      console.error("Error creating driver:", err);
      toast.error("An unexpected error occurred while creating the driver.");
    }
  };